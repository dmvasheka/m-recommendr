# Smart Search (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-01-smart-search-design.md`

**Goal:** Build `SmartSearchService` — a hybrid (pgvector + tsvector) search with LLM structured-query extraction, used by `/api/movies/search`, `/api/tv-shows/search`, and the chat module's retrieval stage.

**Architecture:** New `apps/api/src/smart-search/` module. Per-language tsvector columns + GIN indexes added via migration. LLM (gpt-4o-mini default, gpt-4o on retry/long queries) extracts structured filters; SQL pre-filters; vector and keyword run in parallel inside the candidate set; RRF merges. Failure paths: invalid LLM JSON → pure hybrid; empty after filters → soft-relax; one branch fails → other still serves. Chat module refactored to use the same service.

**Tech Stack:** NestJS, TypeScript, Supabase Postgres + pgvector + tsvector, OpenAI (gpt-4o-mini / gpt-4o + text-embedding-3-small), ioredis, Zod, Jest.

---

## File map

**New files:**
- `supabase/migrations/<TIMESTAMP>_add_search_vectors.sql` — tsvector columns, trigger, GIN indexes, candidate-restricted RPCs
- `apps/api/src/scripts/backfill-search-vectors.ts` — batched backfill of existing rows
- `apps/api/src/smart-search/smart-search.module.ts`
- `apps/api/src/smart-search/smart-search.types.ts`
- `apps/api/src/smart-search/smart-search.service.ts`
- `apps/api/src/smart-search/query-extractor.service.ts`
- `apps/api/src/smart-search/keyword-search.service.ts`
- `apps/api/src/smart-search/vector-search.service.ts`
- `apps/api/src/smart-search/filter-builder.ts`
- `apps/api/src/smart-search/hybrid-merger.ts`
- `apps/api/src/smart-search/__tests__/rrf.spec.ts`
- `apps/api/src/smart-search/__tests__/filter-builder.spec.ts`
- `apps/api/src/smart-search/__tests__/query-extractor.spec.ts`
- `apps/api/src/smart-search/__tests__/smart-search.service.spec.ts`

**Modified files:**
- `apps/api/src/app.module.ts` — register `SmartSearchModule`
- `apps/api/src/movies/movies.controller.ts` — `/search` endpoint delegates to SmartSearch
- `apps/api/src/movies/movies.module.ts` — import `SmartSearchModule`
- `apps/api/src/tv-shows/tv-shows.controller.ts` — `/search` endpoint delegates to SmartSearch
- `apps/api/src/tv-shows/tv-shows.module.ts` — import `SmartSearchModule`
- `apps/api/src/chat/chat.service.ts` — retrieval via SmartSearch, watchlist bias post-step
- `apps/api/src/chat/chat.module.ts` — import `SmartSearchModule`
- `apps/web/<call site>` — frontend updates for new response shape (locate during Task 21)

---

## Task 1: DB migration — movies tsvector columns + trigger + GIN indexes

**Files:**
- Create: `supabase/migrations/<TIMESTAMP>_add_search_vectors.sql` (use `supabase migration new add_search_vectors` to generate the timestamp)

- [ ] **Step 1: Generate migration file**

```bash
cd /home/user/Projects/movie-recommendr
supabase migration new add_search_vectors
```

Expected: a new file `supabase/migrations/<TIMESTAMP>_add_search_vectors.sql` is created.

- [ ] **Step 2: Write the movies portion of the migration**

```sql
-- supabase/migrations/<TIMESTAMP>_add_search_vectors.sql
-- Phase 1: add per-language tsvector columns + GIN indexes for hybrid search

-- Movies
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS search_vector_en tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_ru tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_uk tsvector;

CREATE OR REPLACE FUNCTION public.movies_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector_en := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.translations->'en'->>'title', '') || ' ' ||
    coalesce(NEW.translations->'en'->>'overview', '')
  );
  NEW.search_vector_ru := to_tsvector('russian',
    coalesce(NEW.translations->'ru'->>'title', '') || ' ' ||
    coalesce(NEW.translations->'ru'->>'overview', '')
  );
  NEW.search_vector_uk := to_tsvector('simple',
    coalesce(NEW.translations->'uk'->>'title', '') || ' ' ||
    coalesce(NEW.translations->'uk'->>'overview', '')
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movies_search_vector_trigger ON public.movies;
CREATE TRIGGER movies_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, translations ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.movies_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_movies_search_en ON public.movies USING gin(search_vector_en);
CREATE INDEX IF NOT EXISTS idx_movies_search_ru ON public.movies USING gin(search_vector_ru);
CREATE INDEX IF NOT EXISTS idx_movies_search_uk ON public.movies USING gin(search_vector_uk);

-- GIN on genres (used by filter-builder for `genres && $1::text[]`)
CREATE INDEX IF NOT EXISTS idx_movies_genres ON public.movies USING gin(genres);
```

- [ ] **Step 3: Add tv_shows portion to the same migration file**

First verify exact tv_shows column names by reading `supabase/migrations/20260111000001_add_tv_shows.sql` and any later ALTERs for translations. Use the matching column names below (default assumption: tv_shows has `name` instead of `title`, `overview` instead of `description`, plus `translations` JSONB. Adjust if the schema differs).

```sql
-- TV Shows
ALTER TABLE public.tv_shows
  ADD COLUMN IF NOT EXISTS search_vector_en tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_ru tsvector,
  ADD COLUMN IF NOT EXISTS search_vector_uk tsvector;

CREATE OR REPLACE FUNCTION public.tv_shows_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector_en := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.overview, '') || ' ' ||
    coalesce(NEW.translations->'en'->>'name', '') || ' ' ||
    coalesce(NEW.translations->'en'->>'overview', '')
  );
  NEW.search_vector_ru := to_tsvector('russian',
    coalesce(NEW.translations->'ru'->>'name', '') || ' ' ||
    coalesce(NEW.translations->'ru'->>'overview', '')
  );
  NEW.search_vector_uk := to_tsvector('simple',
    coalesce(NEW.translations->'uk'->>'name', '') || ' ' ||
    coalesce(NEW.translations->'uk'->>'overview', '')
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tv_shows_search_vector_trigger ON public.tv_shows;
CREATE TRIGGER tv_shows_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, overview, translations ON public.tv_shows
  FOR EACH ROW EXECUTE FUNCTION public.tv_shows_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_tv_shows_search_en ON public.tv_shows USING gin(search_vector_en);
CREATE INDEX IF NOT EXISTS idx_tv_shows_search_ru ON public.tv_shows USING gin(search_vector_ru);
CREATE INDEX IF NOT EXISTS idx_tv_shows_search_uk ON public.tv_shows USING gin(search_vector_uk);

CREATE INDEX IF NOT EXISTS idx_tv_shows_genres ON public.tv_shows USING gin(genres);
```

- [ ] **Step 4: Add candidate-restricted vector-search RPCs**

Append to the same migration file:

```sql
-- Candidate-restricted variant of match_movies (vector search constrained to a given ID set)
CREATE OR REPLACE FUNCTION public.match_movies_in_set (
  query_embedding vector(1536),
  candidate_ids bigint[],
  match_count int DEFAULT 50
)
RETURNS TABLE (
  id bigint,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT m.id, 1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.movies m
  WHERE m.embedding IS NOT NULL
    AND (candidate_ids IS NULL OR m.id = ANY(candidate_ids))
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Same for tv_shows
CREATE OR REPLACE FUNCTION public.match_tv_shows_in_set (
  query_embedding vector(1536),
  candidate_ids bigint[],
  match_count int DEFAULT 50
)
RETURNS TABLE (
  id bigint,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT t.id, 1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.tv_shows t
  WHERE t.embedding IS NOT NULL
    AND (candidate_ids IS NULL OR t.id = ANY(candidate_ids))
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

- [ ] **Step 5: Apply migration locally**

```bash
cd /home/user/Projects/movie-recommendr
supabase db reset --debug
```

Expected: migration runs cleanly, no errors. New columns + indexes exist; new RPC functions exist. Verify with:

```bash
supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name='movies' AND column_name LIKE 'search_vector%';"
```

Expected three rows: `search_vector_en`, `search_vector_ru`, `search_vector_uk`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/<TIMESTAMP>_add_search_vectors.sql
git commit -m "feat(db): add per-language tsvector columns and candidate-restricted vector RPCs"
```

---

## Task 2: Backfill script for existing rows

**Files:**
- Create: `apps/api/src/scripts/backfill-search-vectors.ts`

- [ ] **Step 1: Add the `touch_rows_for_tsvector` helper RPC to the migration**

Append to `supabase/migrations/<TIMESTAMP>_add_search_vectors.sql`:

```sql
-- Helper for the backfill script. Re-writes a column to itself for the given
-- IDs to fire the BEFORE UPDATE trigger that populates the tsvector columns.
-- Allowlists table/column to prevent injection.
CREATE OR REPLACE FUNCTION public.touch_rows_for_tsvector(
    p_table text,
    p_column text,
    p_ids bigint[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_table NOT IN ('movies', 'tv_shows') THEN
        RAISE EXCEPTION 'invalid table: %', p_table;
    END IF;
    IF p_column NOT IN ('title', 'name') THEN
        RAISE EXCEPTION 'invalid column: %', p_column;
    END IF;
    EXECUTE format('UPDATE public.%I SET %I = %I WHERE id = ANY($1::bigint[])', p_table, p_column, p_column) USING p_ids;
END $$;
REVOKE ALL ON FUNCTION public.touch_rows_for_tsvector(text, text, bigint[]) FROM PUBLIC;
```

Why "touch": the `BEFORE UPDATE OF title, description, translations` trigger only fires when one of those columns is in the SET clause. `SET title = title` qualifies and forces the trigger; `SET updated_at = now()` would NOT.

- [ ] **Step 2: Write the backfill script**

```ts
// apps/api/src/scripts/backfill-search-vectors.ts
import '../dotenv-loader';
import { supabase } from '@repo/db';

async function backfill(table: 'movies' | 'tv_shows', batchSize = 1000, pauseMs = 200) {
    const triggerColumn = table === 'movies' ? 'title' : 'name';
    console.log(`🔄 Backfilling tsvector on ${table} via column ${triggerColumn}`);

    let totalDone = 0;
    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select('id')
            .is('search_vector_en', null)
            .order('id')
            .limit(batchSize);

        if (error) throw new Error(`fetch failed: ${error.message}`);
        if (!data || data.length === 0) break;

        const ids = data.map((row: { id: number }) => row.id);

        const { error: updErr } = await (supabase.rpc as any)('touch_rows_for_tsvector', {
            p_table: table,
            p_column: triggerColumn,
            p_ids: ids,
        });

        if (updErr) throw new Error(`update failed: ${updErr.message}`);

        totalDone += data.length;
        console.log(`  progress: +${data.length} (total ${totalDone})`);
        await new Promise((r) => setTimeout(r, pauseMs));
    }

    console.log(`✅ Backfilled ${totalDone} rows in ${table}`);
}

async function main() {
    const target = process.argv[2] as 'movies' | 'tv_shows' | undefined;
    if (target === 'movies' || target === 'tv_shows') {
        await backfill(target);
    } else {
        await backfill('movies');
        await backfill('tv_shows');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
```

- [ ] **Step 3: Re-apply migration**

```bash
supabase db reset --debug
```

Expected: success, the function exists.

- [ ] **Step 4: Run the script against local DB to verify it works on a small sample**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
npx tsx src/scripts/backfill-search-vectors.ts movies
```

Expected: prints progress lines, ends with "✅ Backfilled N rows in movies".

Spot-check a row:

```bash
supabase db query "SELECT id, length(search_vector_en::text) FROM public.movies WHERE search_vector_en IS NOT NULL LIMIT 5;"
```

Expected: 5 rows with non-zero lengths.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/scripts/backfill-search-vectors.ts supabase/migrations/<TIMESTAMP>_add_search_vectors.sql
git commit -m "feat(scripts): add backfill script for tsvector search columns"
```

---

## Task 3: smart-search module skeleton + types

**Files:**
- Create: `apps/api/src/smart-search/smart-search.module.ts`
- Create: `apps/api/src/smart-search/smart-search.types.ts`

- [ ] **Step 1: Write types**

```ts
// apps/api/src/smart-search/smart-search.types.ts
import { z } from 'zod';

export const ExtractedFiltersSchema = z.object({
    genres: z.array(z.string()).optional(),
    year_min: z.number().int().nullable().optional(),
    year_max: z.number().int().nullable().optional(),
    cast: z.array(z.string()).optional(),
    directors: z.array(z.string()).optional(),
    vote_average_min: z.number().min(0).max(10).nullable().optional(),
    runtime_min: z.number().int().nullable().optional(),
    runtime_max: z.number().int().nullable().optional(),
    themes: z.array(z.string()).optional(),
    mood: z.array(z.string()).optional(),
    exclusions: z.array(z.string()).optional(),
    semantic_remainder: z.string(),
});

export type ExtractedFilters = z.infer<typeof ExtractedFiltersSchema>;

export type ContentType = 'movie' | 'tv_show' | 'mixed';
export type Language = 'en' | 'ru' | 'uk';
export type LlmTier = 'mini' | 'full' | 'none';
export type RetrievalMode = 'hybrid' | 'fallback_vector_only' | 'fallback_keyword_only';

export interface SmartSearchParams {
    query: string;
    contentType: ContentType;
    language: Language;
    limit?: number;
}

export interface AppliedFilters {
    genres?: string[];
    year_min?: number;
    year_max?: number;
    cast?: string[];
    directors?: string[];
    vote_average_min?: number;
    runtime_min?: number;
    runtime_max?: number;
}

export interface SmartSearchMeta {
    extracted_filters: ExtractedFilters | null;
    applied_filters: AppliedFilters;
    relaxed: boolean;
    exclusions_skipped: boolean;
    retrieval_mode: RetrievalMode;
    llm_tier_used: LlmTier;
    latency_ms: { total: number; extraction: number; retrieval: number };
}

export interface SmartSearchItem {
    id: number;
    content_type: 'movie' | 'tv_show';
    title: string;
    description: string | null;
    poster_url: string | null;
    backdrop_url: string | null;
    genres: string[] | null;
    vote_average: number | null;
    score: number;  // RRF-merged score
}

export interface SmartSearchResult {
    items: SmartSearchItem[];
    meta: SmartSearchMeta;
}

export interface RankedId {
    id: number;
    rank: number;  // 1-based
}
```

- [ ] **Step 2: Write module skeleton**

```ts
// apps/api/src/smart-search/smart-search.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [RedisModule],
    providers: [],   // populated as services are added in subsequent tasks
    exports: [],
})
export class SmartSearchModule {}
```

- [ ] **Step 3: Register in AppModule**

```ts
// apps/api/src/app.module.ts — add import + entry
import { SmartSearchModule } from './smart-search/smart-search.module';

@Module({
    imports: [
        // ... existing imports ...
        SmartSearchModule,
        // ...
    ],
    // ...
})
export class AppModule {}
```

- [ ] **Step 4: Verify TS compiles**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
npx tsc --noEmit
```

Expected: no new errors from smart-search files (existing pre-existing errors in `bull-board.setup.ts` are OK).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/smart-search/ apps/api/src/app.module.ts
git commit -m "feat(smart-search): scaffold module + Zod types"
```

---

## Task 4: RRF (Reciprocal Rank Fusion) merger with tests

**Files:**
- Create: `apps/api/src/smart-search/hybrid-merger.ts`
- Create: `apps/api/src/smart-search/__tests__/rrf.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/api/src/smart-search/__tests__/rrf.spec.ts
import { rrfMerge } from '../hybrid-merger';
import type { RankedId } from '../smart-search.types';

describe('rrfMerge', () => {
    const k = 60;

    it('returns empty when all input lists are empty', () => {
        expect(rrfMerge([], k)).toEqual([]);
    });

    it('returns single list ordered by RRF score (== same order) when only one list', () => {
        const a: RankedId[] = [
            { id: 1, rank: 1 },
            { id: 2, rank: 2 },
            { id: 3, rank: 3 },
        ];
        const merged = rrfMerge([a], k);
        expect(merged.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('boosts items appearing in both lists above items appearing in only one', () => {
        const vec: RankedId[] = [
            { id: 1, rank: 1 },
            { id: 2, rank: 2 },
        ];
        const kw: RankedId[] = [
            { id: 3, rank: 1 },
            { id: 1, rank: 2 },  // 1 is in both
        ];
        const merged = rrfMerge([vec, kw], k);
        expect(merged[0].id).toBe(1);  // intersection wins
    });

    it('handles duplicate IDs within a single list by using best (lowest) rank', () => {
        const a: RankedId[] = [
            { id: 1, rank: 5 },
            { id: 1, rank: 1 },
        ];
        const merged = rrfMerge([a], k);
        // score = 1/(60+1) ≈ 0.0164
        expect(merged[0].id).toBe(1);
        expect(merged[0].score).toBeCloseTo(1 / (k + 1), 5);
    });

    it('result is sorted by score descending', () => {
        const a: RankedId[] = [
            { id: 1, rank: 1 },
            { id: 2, rank: 2 },
            { id: 3, rank: 3 },
        ];
        const merged = rrfMerge([a], k);
        for (let i = 1; i < merged.length; i++) {
            expect(merged[i - 1].score).toBeGreaterThanOrEqual(merged[i].score);
        }
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
npx jest src/smart-search/__tests__/rrf.spec.ts
```

Expected: FAIL with "Cannot find module '../hybrid-merger'".

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/smart-search/hybrid-merger.ts
import type { RankedId } from './smart-search.types';

export interface MergedResult {
    id: number;
    score: number;
}

/**
 * Reciprocal Rank Fusion. k=60 is the standard.
 * For each ranked list, item gets score 1/(k+rank). Sum across lists.
 * Within a list, if an id appears multiple times, use the best (lowest) rank.
 */
export function rrfMerge(lists: RankedId[][], k = 60): MergedResult[] {
    const scores = new Map<number, number>();

    for (const list of lists) {
        const bestRank = new Map<number, number>();
        for (const { id, rank } of list) {
            const cur = bestRank.get(id);
            if (cur === undefined || rank < cur) bestRank.set(id, rank);
        }
        for (const [id, rank] of bestRank) {
            scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
        }
    }

    return Array.from(scores, ([id, score]) => ({ id, score }))
        .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npx jest src/smart-search/__tests__/rrf.spec.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/smart-search/hybrid-merger.ts apps/api/src/smart-search/__tests__/rrf.spec.ts
git commit -m "feat(smart-search): RRF hybrid merger with tests"
```

---

## Task 5: filter-builder with tests

**Files:**
- Create: `apps/api/src/smart-search/filter-builder.ts`
- Create: `apps/api/src/smart-search/__tests__/filter-builder.spec.ts`

**Note on shape:** The builder emits a single `whereSql` string with values embedded as Postgres literals (via a typed `quote()` helper). Reason: the SQL is forwarded to a Postgres RPC (`exec_filter_query`, added in Task 9) that runs `EXECUTE` on the string. Parameterized binds across an RPC boundary are awkward in Supabase JS; literal-embedding with strict typing (only numbers and string-arrays from the validated Zod schema) is safe and simple. Single quotes inside strings are escaped by doubling.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/api/src/smart-search/__tests__/filter-builder.spec.ts
import { buildFilterFragments } from '../filter-builder';
import type { ExtractedFilters } from '../smart-search.types';

describe('buildFilterFragments', () => {
    it('returns empty whereSql when filters empty', () => {
        const f: ExtractedFilters = { semantic_remainder: '' };
        const out = buildFilterFragments(f, 'movie');
        expect(out.whereSql).toBe('');
        expect(out.applied).toEqual({});
    });

    it('emits genres fragment with quoted array', () => {
        const f: ExtractedFilters = { semantic_remainder: '', genres: ['Comedy', 'Thriller'] };
        const { whereSql, applied } = buildFilterFragments(f, 'movie');
        expect(whereSql).toContain("genres && ARRAY['Comedy','Thriller']::text[]");
        expect(applied.genres).toEqual(['Comedy', 'Thriller']);
    });

    it('emits year range with both bounds for movies (release_date)', () => {
        const f: ExtractedFilters = { semantic_remainder: '', year_min: 1990, year_max: 1999 };
        const { whereSql, applied } = buildFilterFragments(f, 'movie');
        expect(whereSql).toContain('EXTRACT(YEAR FROM release_date) BETWEEN 1990 AND 1999');
        expect(applied.year_min).toBe(1990);
        expect(applied.year_max).toBe(1999);
    });

    it('uses first_air_date for tv_show year filter', () => {
        const f: ExtractedFilters = { semantic_remainder: '', year_min: 2010 };
        const { whereSql } = buildFilterFragments(f, 'tv_show');
        expect(whereSql).toContain('EXTRACT(YEAR FROM first_air_date) >= 2010');
    });

    it('emits cast filter with ILIKE ANY against movie_cast jsonb array', () => {
        const f: ExtractedFilters = { semantic_remainder: '', cast: ['Bill Murray'] };
        const { whereSql } = buildFilterFragments(f, 'movie');
        expect(whereSql).toContain("jsonb_array_elements(movie_cast)");
        expect(whereSql).toContain("ILIKE ANY(ARRAY['%Bill Murray%'])");
    });

    it('emits directors filter with job=Director constraint', () => {
        const f: ExtractedFilters = { semantic_remainder: '', directors: ['Fincher'] };
        const { whereSql } = buildFilterFragments(f, 'movie');
        expect(whereSql).toContain("c->>'job'='Director'");
        expect(whereSql).toContain("ILIKE ANY(ARRAY['%Fincher%'])");
    });

    it('emits vote_average_min and runtime range', () => {
        const f: ExtractedFilters = {
            semantic_remainder: '',
            vote_average_min: 7.5,
            runtime_min: 90,
            runtime_max: 130,
        };
        const { whereSql } = buildFilterFragments(f, 'movie');
        expect(whereSql).toContain('vote_average >= 7.5');
        expect(whereSql).toContain('runtime BETWEEN 90 AND 130');
    });

    it('does NOT emit fragments for themes/mood/exclusions (handled elsewhere)', () => {
        const f: ExtractedFilters = {
            semantic_remainder: '',
            themes: ['loneliness'],
            mood: ['dark'],
            exclusions: ['violence'],
        };
        expect(buildFilterFragments(f, 'movie').whereSql).toBe('');
    });

    it("escapes single quotes in cast names (e.g. O'Connor)", () => {
        const f: ExtractedFilters = { semantic_remainder: '', cast: ["O'Connor"] };
        const { whereSql } = buildFilterFragments(f, 'movie');
        expect(whereSql).toContain("'%O''Connor%'");
    });

    it('joins multiple fragments with AND', () => {
        const f: ExtractedFilters = {
            semantic_remainder: '',
            genres: ['comedy'],
            year_min: 1990,
            year_max: 1999,
        };
        const { whereSql } = buildFilterFragments(f, 'movie');
        expect(whereSql.split(' AND ').length).toBe(2);
    });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
npx jest src/smart-search/__tests__/filter-builder.spec.ts
```

Expected: FAIL with "Cannot find module '../filter-builder'".

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/smart-search/filter-builder.ts
import type { ExtractedFilters, AppliedFilters } from './smart-search.types';

export interface FilterFragments {
    whereSql: string;          // single AND-joined WHERE clause body (no leading WHERE)
    applied: AppliedFilters;
}

const FIELDS = {
    movie:   { castColumn: 'movie_cast',    crewColumn: 'crew', yearColumn: 'release_date' },
    tv_show: { castColumn: 'tv_cast',       crewColumn: 'crew', yearColumn: 'first_air_date' },
};

function quote(v: unknown): string {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (Array.isArray(v)) return `ARRAY[${v.map(quote).join(',')}]`;
    return `'${String(v).replace(/'/g, "''")}'`;
}

export function buildFilterFragments(
    f: ExtractedFilters,
    contentType: 'movie' | 'tv_show',
): FilterFragments {
    const fields = FIELDS[contentType];
    const where: string[] = [];
    const applied: AppliedFilters = {};

    if (f.genres?.length) {
        where.push(`genres && ${quote(f.genres)}::text[]`);
        applied.genres = f.genres;
    }

    if (f.year_min != null && f.year_max != null) {
        where.push(`EXTRACT(YEAR FROM ${fields.yearColumn}) BETWEEN ${quote(f.year_min)} AND ${quote(f.year_max)}`);
        applied.year_min = f.year_min;
        applied.year_max = f.year_max;
    } else if (f.year_min != null) {
        where.push(`EXTRACT(YEAR FROM ${fields.yearColumn}) >= ${quote(f.year_min)}`);
        applied.year_min = f.year_min;
    } else if (f.year_max != null) {
        where.push(`EXTRACT(YEAR FROM ${fields.yearColumn}) <= ${quote(f.year_max)}`);
        applied.year_max = f.year_max;
    }

    if (f.vote_average_min != null) {
        where.push(`vote_average >= ${quote(f.vote_average_min)}`);
        applied.vote_average_min = f.vote_average_min;
    }

    if (f.runtime_min != null && f.runtime_max != null) {
        where.push(`runtime BETWEEN ${quote(f.runtime_min)} AND ${quote(f.runtime_max)}`);
        applied.runtime_min = f.runtime_min;
        applied.runtime_max = f.runtime_max;
    } else if (f.runtime_min != null) {
        where.push(`runtime >= ${quote(f.runtime_min)}`);
        applied.runtime_min = f.runtime_min;
    } else if (f.runtime_max != null) {
        where.push(`runtime <= ${quote(f.runtime_max)}`);
        applied.runtime_max = f.runtime_max;
    }

    if (f.cast?.length) {
        const patterns = f.cast.map((s) => `%${s}%`);
        where.push(`EXISTS (SELECT 1 FROM jsonb_array_elements(${fields.castColumn}) c WHERE c->>'name' ILIKE ANY(${quote(patterns)}))`);
        applied.cast = f.cast;
    }

    if (f.directors?.length) {
        const patterns = f.directors.map((s) => `%${s}%`);
        where.push(`EXISTS (SELECT 1 FROM jsonb_array_elements(${fields.crewColumn}) c WHERE c->>'job'='Director' AND c->>'name' ILIKE ANY(${quote(patterns)}))`);
        applied.directors = f.directors;
    }

    return { whereSql: where.join(' AND '), applied };
}
```

**Note on tv_shows columns:** `FIELDS.tv_show.castColumn` is a placeholder. Verify against `supabase/migrations/20260111000001_add_tv_shows.sql` and any later additions. If tv_shows has no cast/crew JSONB columns at the time of implementation, change the builder to skip the cast/directors fragments when `contentType === 'tv_show'` (e.g. wrap each emission in a `if (fields.castColumn)` guard with the column being nullable in `FIELDS`).

- [ ] **Step 4: Run tests, verify pass**

```bash
npx jest src/smart-search/__tests__/filter-builder.spec.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/smart-search/filter-builder.ts apps/api/src/smart-search/__tests__/filter-builder.spec.ts
git commit -m "feat(smart-search): filter-builder maps ExtractedFilters to SQL fragments"
```

---

## Task 6: keyword-search service

**Files:**
- Create: `apps/api/src/smart-search/keyword-search.service.ts`
- Modify: `apps/api/src/smart-search/smart-search.module.ts` — register provider

- [ ] **Step 1: Implement the service**

```ts
// apps/api/src/smart-search/keyword-search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import type { Language, RankedId } from './smart-search.types';

const LANG_TO_VECTOR_COL = {
    en: 'search_vector_en',
    ru: 'search_vector_ru',
    uk: 'search_vector_uk',
} as const;

const LANG_TO_TS_CONFIG = {
    en: 'english',
    ru: 'russian',
    uk: 'simple',
} as const;

@Injectable()
export class KeywordSearchService {
    private readonly logger = new Logger(KeywordSearchService.name);

    /**
     * Run a tsvector-based keyword search constrained to candidate_ids.
     * Returns up to `limit` IDs ranked by ts_rank descending.
     */
    async search(
        table: 'movies' | 'tv_shows',
        query: string,
        language: Language,
        candidateIds: number[] | null,
        limit = 50,
    ): Promise<RankedId[]> {
        const vectorCol = LANG_TO_VECTOR_COL[language];
        const tsConfig = LANG_TO_TS_CONFIG[language];

        // Use raw SQL via rpc — Supabase JS doesn't expose ts_rank directly.
        const sql = candidateIds && candidateIds.length > 0
            ? `SELECT id, ts_rank(${vectorCol}, plainto_tsquery('${tsConfig}', $1)) AS rank
               FROM public.${table}
               WHERE ${vectorCol} @@ plainto_tsquery('${tsConfig}', $1)
                 AND id = ANY($2::bigint[])
               ORDER BY rank DESC
               LIMIT ${limit}`
            : `SELECT id, ts_rank(${vectorCol}, plainto_tsquery('${tsConfig}', $1)) AS rank
               FROM public.${table}
               WHERE ${vectorCol} @@ plainto_tsquery('${tsConfig}', $1)
               ORDER BY rank DESC
               LIMIT ${limit}`;

        try {
            const { data, error } = await (supabase.rpc as any)('keyword_search_rpc', {
                p_sql: sql,
                p_query: query,
                p_ids: candidateIds,
            });
            if (error) throw new Error(error.message);
            return (data ?? []).map((row: { id: number }, idx: number) => ({
                id: row.id,
                rank: idx + 1,
            }));
        } catch (err) {
            this.logger.warn(`keyword search failed: ${err instanceof Error ? err.message : String(err)}`);
            return [];
        }
    }
}
```

- [ ] **Step 2: Add `keyword_search_rpc` to the migration file**

Append to `supabase/migrations/<TIMESTAMP>_add_search_vectors.sql`:

```sql
-- Generic keyword-search RPC. Allowlists tables/columns to prevent SQL injection.
CREATE OR REPLACE FUNCTION public.keyword_search_rpc(
    p_table text,
    p_lang text,
    p_query text,
    p_ids bigint[] DEFAULT NULL,
    p_limit int DEFAULT 50
)
RETURNS TABLE (id bigint, rank float)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_vector_col text;
    v_ts_config text;
    v_sql text;
BEGIN
    IF p_table NOT IN ('movies', 'tv_shows') THEN
        RAISE EXCEPTION 'invalid table: %', p_table;
    END IF;
    IF p_lang NOT IN ('en', 'ru', 'uk') THEN
        RAISE EXCEPTION 'invalid lang: %', p_lang;
    END IF;
    v_vector_col := 'search_vector_' || p_lang;
    v_ts_config := CASE p_lang WHEN 'en' THEN 'english' WHEN 'ru' THEN 'russian' ELSE 'simple' END;

    IF p_ids IS NULL THEN
        v_sql := format(
            'SELECT id, ts_rank(%I, plainto_tsquery(%L, $1)) AS rank FROM public.%I
             WHERE %I @@ plainto_tsquery(%L, $1)
             ORDER BY rank DESC LIMIT $2',
            v_vector_col, v_ts_config, p_table, v_vector_col, v_ts_config
        );
        RETURN QUERY EXECUTE v_sql USING p_query, p_limit;
    ELSE
        v_sql := format(
            'SELECT id, ts_rank(%I, plainto_tsquery(%L, $1)) AS rank FROM public.%I
             WHERE %I @@ plainto_tsquery(%L, $1) AND id = ANY($2::bigint[])
             ORDER BY rank DESC LIMIT $3',
            v_vector_col, v_ts_config, p_table, v_vector_col, v_ts_config
        );
        RETURN QUERY EXECUTE v_sql USING p_query, p_ids, p_limit;
    END IF;
END $$;
```

- [ ] **Step 3: Update the service to call the RPC properly**

Replace the body of `KeywordSearchService.search` with:

```ts
async search(
    table: 'movies' | 'tv_shows',
    query: string,
    language: Language,
    candidateIds: number[] | null,
    limit = 50,
): Promise<RankedId[]> {
    try {
        const { data, error } = await (supabase.rpc as any)('keyword_search_rpc', {
            p_table: table,
            p_lang: language,
            p_query: query,
            p_ids: candidateIds,
            p_limit: limit,
        });
        if (error) throw new Error(error.message);
        return (data ?? []).map((row: { id: number }, idx: number) => ({
            id: row.id,
            rank: idx + 1,
        }));
    } catch (err) {
        this.logger.warn(`keyword search failed: ${err instanceof Error ? err.message : String(err)}`);
        return [];
    }
}
```

- [ ] **Step 4: Register in module**

```ts
// apps/api/src/smart-search/smart-search.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { KeywordSearchService } from './keyword-search.service';

@Module({
    imports: [RedisModule],
    providers: [KeywordSearchService],
    exports: [],
})
export class SmartSearchModule {}
```

- [ ] **Step 5: Re-apply migration + verify type-check**

```bash
cd /home/user/Projects/movie-recommendr
supabase db reset --debug
cd apps/api && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/smart-search/keyword-search.service.ts \
        apps/api/src/smart-search/smart-search.module.ts \
        supabase/migrations/<TIMESTAMP>_add_search_vectors.sql
git commit -m "feat(smart-search): keyword-search service via tsvector RPC"
```

---

## Task 7: vector-search service (thin wrapper)

**Files:**
- Create: `apps/api/src/smart-search/vector-search.service.ts`
- Modify: `apps/api/src/smart-search/smart-search.module.ts`

- [ ] **Step 1: Implement**

```ts
// apps/api/src/smart-search/vector-search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import { generateEmbedding } from '@repo/ai';
import type { RankedId } from './smart-search.types';

@Injectable()
export class VectorSearchService {
    private readonly logger = new Logger(VectorSearchService.name);

    async embed(text: string): Promise<number[]> {
        return generateEmbedding(text);
    }

    async search(
        table: 'movies' | 'tv_shows',
        embedding: number[],
        candidateIds: number[] | null,
        limit = 50,
    ): Promise<RankedId[]> {
        const rpc = table === 'movies' ? 'match_movies_in_set' : 'match_tv_shows_in_set';
        try {
            const { data, error } = await (supabase.rpc as any)(rpc, {
                query_embedding: JSON.stringify(embedding),
                candidate_ids: candidateIds,
                match_count: limit,
            });
            if (error) throw new Error(error.message);
            return (data ?? []).map((row: { id: number }, idx: number) => ({
                id: row.id,
                rank: idx + 1,
            }));
        } catch (err) {
            this.logger.warn(`vector search failed: ${err instanceof Error ? err.message : String(err)}`);
            return [];
        }
    }
}
```

- [ ] **Step 2: Register**

```ts
// apps/api/src/smart-search/smart-search.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { KeywordSearchService } from './keyword-search.service';
import { VectorSearchService } from './vector-search.service';

@Module({
    imports: [RedisModule],
    providers: [KeywordSearchService, VectorSearchService],
    exports: [],
})
export class SmartSearchModule {}
```

- [ ] **Step 3: Type-check**

```bash
cd /home/user/Projects/movie-recommendr/apps/api && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/smart-search/vector-search.service.ts apps/api/src/smart-search/smart-search.module.ts
git commit -m "feat(smart-search): vector-search wrapper over candidate-restricted RPCs"
```

---

## Task 8: query-extractor service (mini path) with mocked tests

**Files:**
- Create: `apps/api/src/smart-search/query-extractor.service.ts`
- Create: `apps/api/src/smart-search/__tests__/query-extractor.spec.ts`
- Modify: `apps/api/src/smart-search/smart-search.module.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/api/src/smart-search/__tests__/query-extractor.spec.ts
import { QueryExtractorService } from '../query-extractor.service';
import { RedisService } from '../../redis/redis.service';

const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
} as unknown as RedisService;

const mockOpenAI = {
    chat: { completions: { create: jest.fn() } },
};

describe('QueryExtractorService', () => {
    let svc: QueryExtractorService;

    beforeEach(() => {
        jest.clearAllMocks();
        (mockRedis.get as jest.Mock).mockResolvedValue(null);
        svc = new QueryExtractorService(mockRedis, mockOpenAI as any);
    });

    it('returns parsed filters on valid mini response', async () => {
        (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            genres: ['comedy'],
                            year_min: 1990,
                            year_max: 1999,
                            cast: ['Bill Murray'],
                            semantic_remainder: '',
                        }),
                    },
                },
            ],
        });

        const result = await svc.extract('comedies from the 90s with Bill Murray', 'en');
        expect(result.filters?.genres).toEqual(['comedy']);
        expect(result.tier).toBe('mini');
    });

    it('escalates to full on invalid JSON from mini', async () => {
        (mockOpenAI.chat.completions.create as jest.Mock)
            .mockResolvedValueOnce({ choices: [{ message: { content: 'not json' } }] })
            .mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({ genres: ['drama'], semantic_remainder: '' }),
                        },
                    },
                ],
            });

        const result = await svc.extract('something', 'en');
        expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
        expect(result.tier).toBe('full');
        expect(result.filters?.genres).toEqual(['drama']);
    });

    it('returns null filters when both mini and full return invalid', async () => {
        (mockOpenAI.chat.completions.create as jest.Mock)
            .mockResolvedValue({ choices: [{ message: { content: 'garbage' } }] });

        const result = await svc.extract('something', 'en');
        expect(result.filters).toBeNull();
        expect(result.tier).toBe('none');
    });

    it('returns cached filters without LLM call when cache hit', async () => {
        (mockRedis.get as jest.Mock).mockResolvedValueOnce({
            filters: { genres: ['horror'], semantic_remainder: '' },
            tier: 'mini',
        });

        const result = await svc.extract('horror', 'en');
        expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
        expect(result.filters?.genres).toEqual(['horror']);
    });

    it('uses full tier directly for long queries (>25 words)', async () => {
        (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify({ semantic_remainder: '' }) } }],
        });

        const longQuery = Array(30).fill('word').join(' ');
        const result = await svc.extract(longQuery, 'en');
        expect(result.tier).toBe('full');
    });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
npx jest src/smart-search/__tests__/query-extractor.spec.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the service**

```ts
// apps/api/src/smart-search/query-extractor.service.ts
import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';
import {
    ExtractedFiltersSchema,
    type ExtractedFilters,
    type Language,
    type LlmTier,
} from './smart-search.types';

interface ExtractResult {
    filters: ExtractedFilters | null;
    tier: LlmTier;
}

const SUBORDINATE_RX = /(который|которая|которое|but|except|без|кроме|если|when|що|якщо)/gi;

const SYSTEM_PROMPT = `You extract structured movie/tv-show search filters from natural language queries.
Return JSON matching the schema strictly. Use null for unknown fields. Put any unstructured request text into semantic_remainder.

Examples (RU):
Query: "комедии 90-х с Биллом Мюрреем"
Output: {"genres":["comedy"],"year_min":1990,"year_max":1999,"cast":["Bill Murray"],"semantic_remainder":""}

Query: "что-то как Inception но веселее"
Output: {"mood":["uplifting"],"semantic_remainder":"like Inception"}

Examples (EN):
Query: "thrillers by Fincher rated above 8"
Output: {"genres":["thriller"],"directors":["Fincher"],"vote_average_min":8,"semantic_remainder":""}

Examples (UK):
Query: "фантастика 2010+"
Output: {"genres":["sci-fi"],"year_min":2010,"semantic_remainder":""}`;

@Injectable()
export class QueryExtractorService {
    private readonly logger = new Logger(QueryExtractorService.name);
    private readonly openai: OpenAI;

    constructor(
        private readonly redis: RedisService,
        @Optional() @Inject('OPENAI_CLIENT') openaiOverride?: OpenAI,
    ) {
        this.openai = openaiOverride ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    private cacheKey(query: string, language: Language): string {
        const hash = crypto.createHash('sha256').update(`${query}|${language}`).digest('hex');
        return `extract:${hash}`;
    }

    private isLongOrComplex(query: string): boolean {
        const words = query.trim().split(/\s+/).length;
        if (words > 25) return true;
        const matches = query.match(SUBORDINATE_RX);
        return matches !== null && matches.length >= 2;
    }

    private async callLLM(query: string, language: Language, model: string): Promise<ExtractedFilters | null> {
        const resp = await this.openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Language: ${language}\nQuery: ${query}` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
        });
        const raw = resp.choices[0]?.message?.content;
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return ExtractedFiltersSchema.parse(parsed);
        } catch (err) {
            this.logger.warn(`LLM returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }

    async extract(query: string, language: Language): Promise<ExtractResult> {
        const cacheKey = this.cacheKey(query, language);
        const cached = await this.redis.get<ExtractResult>(cacheKey);
        if (cached) return cached;

        const miniModel = process.env.SMART_SEARCH_EXTRACTION_MODEL_MINI ?? 'gpt-4o-mini';
        const fullModel = process.env.SMART_SEARCH_EXTRACTION_MODEL_FULL ?? 'gpt-4o';
        const startWithFull = this.isLongOrComplex(query);

        let tier: LlmTier;
        let filters: ExtractedFilters | null;

        if (startWithFull) {
            filters = await this.callLLM(query, language, fullModel);
            tier = filters ? 'full' : 'none';
        } else {
            filters = await this.callLLM(query, language, miniModel);
            if (filters) {
                tier = 'mini';
            } else {
                this.logger.log('escalating to full tier after mini failure');
                filters = await this.callLLM(query, language, fullModel);
                tier = filters ? 'full' : 'none';
            }
        }

        const result: ExtractResult = { filters, tier };
        await this.redis.set(cacheKey, result, 24 * 60 * 60);
        return result;
    }
}
```

- [ ] **Step 4: Register in module**

```ts
// apps/api/src/smart-search/smart-search.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { KeywordSearchService } from './keyword-search.service';
import { VectorSearchService } from './vector-search.service';
import { QueryExtractorService } from './query-extractor.service';

@Module({
    imports: [RedisModule],
    providers: [KeywordSearchService, VectorSearchService, QueryExtractorService],
    exports: [],
})
export class SmartSearchModule {}
```

- [ ] **Step 5: Run tests, verify pass**

```bash
npx jest src/smart-search/__tests__/query-extractor.spec.ts
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/smart-search/query-extractor.service.ts \
        apps/api/src/smart-search/__tests__/query-extractor.spec.ts \
        apps/api/src/smart-search/smart-search.module.ts
git commit -m "feat(smart-search): query-extractor service with mini→full escalation and cache"
```

---

## Task 9: SmartSearchService orchestrator (single contentType)

**Files:**
- Create: `apps/api/src/smart-search/smart-search.service.ts`
- Modify: `apps/api/src/smart-search/smart-search.module.ts`

- [ ] **Step 1: Implement**

```ts
// apps/api/src/smart-search/smart-search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';
import { QueryExtractorService } from './query-extractor.service';
import { VectorSearchService } from './vector-search.service';
import { KeywordSearchService } from './keyword-search.service';
import { buildFilterFragments } from './filter-builder';
import { rrfMerge } from './hybrid-merger';
import type {
    SmartSearchParams,
    SmartSearchResult,
    SmartSearchItem,
    AppliedFilters,
    RetrievalMode,
    ExtractedFilters,
} from './smart-search.types';

const RELAX_PRIORITY = ['runtime', 'vote_average', 'year', 'genres'] as const;

@Injectable()
export class SmartSearchService {
    private readonly logger = new Logger(SmartSearchService.name);

    constructor(
        private readonly redis: RedisService,
        private readonly extractor: QueryExtractorService,
        private readonly vector: VectorSearchService,
        private readonly keyword: KeywordSearchService,
    ) {}

    private resultCacheKey(params: SmartSearchParams): string {
        const k = `${params.query}|${params.language}|${params.contentType}|${params.limit ?? 20}`;
        return `smartsearch:${crypto.createHash('sha256').update(k).digest('hex')}`;
    }

    async search(params: SmartSearchParams): Promise<SmartSearchResult> {
        const t0 = Date.now();
        const limit = params.limit ?? 20;

        // 1. Result cache
        const cacheKey = this.resultCacheKey(params);
        const cached = await this.redis.get<SmartSearchResult>(cacheKey);
        if (cached) return cached;

        if (params.contentType === 'mixed') {
            const result = await this.searchMixed(params);
            await this.redis.set(cacheKey, result, 5 * 60);
            return result;
        }

        const table = params.contentType === 'movie' ? 'movies' : 'tv_shows';

        // 2. Parallel: extraction + embedding (using semantic_remainder if extracted)
        const tExtract0 = Date.now();
        const extractionPromise = this.extractor.extract(params.query, params.language);
        // Embed raw query first; if extraction returns a useful semantic_remainder, re-embed.
        let embedding = await this.vector.embed(params.query);
        const extraction = await extractionPromise;
        const tExtract = Date.now() - tExtract0;

        if (extraction.filters && extraction.filters.semantic_remainder.trim()) {
            const remainderText = this.augmentRemainder(extraction.filters);
            embedding = await this.vector.embed(remainderText);
        }

        // 3. Apply filters
        const fragments = extraction.filters
            ? buildFilterFragments(extraction.filters, params.contentType)
            : { whereSql: '', applied: {} as AppliedFilters };

        let candidateIds: number[] | null = null;
        let appliedFilters: AppliedFilters = fragments.applied;
        let relaxed = false;

        if (fragments.whereSql.length > 0) {
            const { ids: filtered } = await this.applyFiltersAndFetchIds(table, fragments);
            candidateIds = filtered;

            if (candidateIds.length === 0) {
                // soft-relax
                const relaxResult = await this.softRelax(table, extraction.filters!);
                candidateIds = relaxResult.ids;
                appliedFilters = relaxResult.applied;
                relaxed = relaxResult.relaxed;
            }
        }

        // 4. Parallel vector + keyword
        const tRetrieval0 = Date.now();
        const [vecRanked, kwRanked] = await Promise.all([
            this.vector.search(table, embedding, candidateIds, 50),
            this.keyword.search(table, extraction.filters?.semantic_remainder || params.query, params.language, candidateIds, 50),
        ]);
        const tRetrieval = Date.now() - tRetrieval0;

        // 5. RRF
        let merged = rrfMerge([vecRanked, kwRanked], 60);

        // 6. Exclusions post-filter
        let exclusionsSkipped = false;
        if (extraction.filters?.exclusions?.length) {
            const filtered = await this.applyExclusions(table, merged, extraction.filters.exclusions);
            if (filtered.length === 0) {
                exclusionsSkipped = true;
            } else {
                merged = filtered;
            }
        }

        merged = merged.slice(0, limit);

        // 7. Hydrate
        const items = await this.hydrate(table, merged.map((m) => m.id), merged, params.language);

        // 8. Determine retrieval mode
        let retrievalMode: RetrievalMode = 'hybrid';
        if (vecRanked.length === 0 && kwRanked.length > 0) retrievalMode = 'fallback_keyword_only';
        else if (kwRanked.length === 0 && vecRanked.length > 0) retrievalMode = 'fallback_vector_only';

        const result: SmartSearchResult = {
            items,
            meta: {
                extracted_filters: extraction.filters,
                applied_filters: appliedFilters,
                relaxed,
                exclusions_skipped: exclusionsSkipped,
                retrieval_mode: retrievalMode,
                llm_tier_used: extraction.tier,
                latency_ms: { total: Date.now() - t0, extraction: tExtract, retrieval: tRetrieval },
            },
        };

        await this.redis.set(cacheKey, result, 5 * 60);
        return result;
    }

    private augmentRemainder(filters: ExtractedFilters): string {
        let text = filters.semantic_remainder;
        if (filters.themes?.length) text += ` themes: ${filters.themes.join(', ')}.`;
        if (filters.mood?.length) text += ` mood: ${filters.mood.join(', ')}.`;
        return text;
    }

    private async applyFiltersAndFetchIds(
        table: 'movies' | 'tv_shows',
        fragments: { whereSql: string; applied: AppliedFilters },
    ): Promise<{ ids: number[] }> {
        if (!fragments.whereSql) return { ids: [] };
        const sql = `SELECT id FROM public.${table} WHERE ${fragments.whereSql} LIMIT 500`;
        try {
            const { data, error } = await (supabase.rpc as any)('exec_filter_query', { p_sql: sql });
            if (error) throw new Error(error.message);
            return { ids: (data ?? []).map((row: { id: number }) => row.id) };
        } catch (err) {
            this.logger.warn(`filter query failed: ${err instanceof Error ? err.message : String(err)}`);
            return { ids: [] };
        }
    }

    private async softRelax(
        table: 'movies' | 'tv_shows',
        filters: ExtractedFilters,
    ): Promise<{ ids: number[]; applied: AppliedFilters; relaxed: boolean }> {
        const f = { ...filters };
        for (const drop of RELAX_PRIORITY) {
            if (drop === 'runtime') {
                delete f.runtime_min;
                delete f.runtime_max;
            } else if (drop === 'vote_average') {
                delete f.vote_average_min;
            } else if (drop === 'year') {
                delete f.year_min;
                delete f.year_max;
            } else if (drop === 'genres') {
                delete f.genres;
            }
            const fragments = buildFilterFragments(f, table === 'movies' ? 'movie' : 'tv_show');
            if (fragments.whereSql.length === 0) {
                return { ids: [], applied: fragments.applied, relaxed: true };
            }
            const { ids } = await this.applyFiltersAndFetchIds(table, fragments);
            if (ids.length > 0) {
                return { ids, applied: fragments.applied, relaxed: true };
            }
        }
        return { ids: [], applied: {}, relaxed: true };
    }

    private async applyExclusions(
        table: 'movies' | 'tv_shows',
        ranked: { id: number; score: number }[],
        exclusions: string[],
    ): Promise<{ id: number; score: number }[]> {
        if (ranked.length === 0) return ranked;
        const ids = ranked.map((r) => r.id);
        const lowercased = exclusions.map((e) => e.toLowerCase());
        const descCol = table === 'movies' ? 'description' : 'overview';
        const { data, error } = await supabase
            .from(table)
            .select(`id, ${descCol}, keywords`)
            .in('id', ids);
        if (error || !data) return ranked;

        const kept = new Set<number>();
        for (const row of data as any[]) {
            const desc = (row[descCol] ?? '').toLowerCase();
            const kws = (row.keywords ?? []).map((k: string) => k.toLowerCase()).join(' ');
            const text = `${desc} ${kws}`;
            const blocked = lowercased.some((e) => text.includes(e));
            if (!blocked) kept.add(row.id);
        }

        return ranked.filter((r) => kept.has(r.id));
    }

    private async hydrate(
        table: 'movies' | 'tv_shows',
        ids: number[],
        scored: { id: number; score: number }[],
        language: string,
    ): Promise<SmartSearchItem[]> {
        if (ids.length === 0) return [];
        const isMovies = table === 'movies';
        const titleCol = isMovies ? 'title' : 'name';
        const descCol = isMovies ? 'description' : 'overview';

        const { data, error } = await supabase
            .from(table)
            .select(`id, ${titleCol}, ${descCol}, poster_url, backdrop_url, genres, vote_average, translations`)
            .in('id', ids);
        if (error || !data) return [];

        const scoreMap = new Map(scored.map((s) => [s.id, s.score]));
        const out: SmartSearchItem[] = [];
        for (const row of data as any[]) {
            const tr = row.translations?.[language] ?? null;
            out.push({
                id: row.id,
                content_type: isMovies ? 'movie' : 'tv_show',
                title: tr?.title ?? tr?.name ?? row[titleCol],
                description: tr?.overview ?? row[descCol],
                poster_url: tr?.poster_url ?? row.poster_url,
                backdrop_url: row.backdrop_url,
                genres: row.genres,
                vote_average: row.vote_average,
                score: scoreMap.get(row.id) ?? 0,
            });
        }
        out.sort((a, b) => b.score - a.score);
        return out;
    }

    private async searchMixed(params: SmartSearchParams): Promise<SmartSearchResult> {
        const limit = params.limit ?? 20;
        const [movieRes, tvRes] = await Promise.all([
            this.search({ ...params, contentType: 'movie', limit }),
            this.search({ ...params, contentType: 'tv_show', limit }),
        ]);

        // Re-merge across content types — RRF on the per-type ranks.
        const movieRanked = movieRes.items.map((it, i) => ({ id: it.id * 10 + 1, rank: i + 1, item: it }));
        const tvRanked = tvRes.items.map((it, i) => ({ id: it.id * 10 + 2, rank: i + 1, item: it }));
        const merged = rrfMerge(
            [movieRanked.map((m) => ({ id: m.id, rank: m.rank })), tvRanked.map((t) => ({ id: t.id, rank: t.rank }))],
            60,
        ).slice(0, limit);

        const lookup = new Map<number, SmartSearchItem>();
        for (const m of movieRanked) lookup.set(m.id, { ...m.item, score: 0 });
        for (const t of tvRanked) lookup.set(t.id, { ...t.item, score: 0 });

        const items = merged.map((m) => ({ ...lookup.get(m.id)!, score: m.score }));

        return {
            items,
            meta: {
                extracted_filters: movieRes.meta.extracted_filters,  // same query, identical extraction
                applied_filters: movieRes.meta.applied_filters,
                relaxed: movieRes.meta.relaxed || tvRes.meta.relaxed,
                exclusions_skipped: movieRes.meta.exclusions_skipped || tvRes.meta.exclusions_skipped,
                retrieval_mode: 'hybrid',
                llm_tier_used: movieRes.meta.llm_tier_used,
                latency_ms: {
                    total: Math.max(movieRes.meta.latency_ms.total, tvRes.meta.latency_ms.total),
                    extraction: movieRes.meta.latency_ms.extraction,
                    retrieval: Math.max(movieRes.meta.latency_ms.retrieval, tvRes.meta.latency_ms.retrieval),
                },
            },
        };
    }
}
```

- [ ] **Step 2: Add `exec_filter_query` RPC to migration**

Append to `supabase/migrations/<TIMESTAMP>_add_search_vectors.sql`:

```sql
-- Filter-query RPC: takes a literal-embedded SQL string built by filter-builder.
-- Strict allowlist: only id-fetch from movies/tv_shows. The values inside the SQL
-- are produced by the typed `quote()` helper in filter-builder, which only formats
-- numbers and string-arrays from the Zod-validated ExtractedFilters schema.
CREATE OR REPLACE FUNCTION public.exec_filter_query(p_sql text)
RETURNS TABLE (id bigint)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_sql !~* '^\s*SELECT\s+id\s+FROM\s+public\.(movies|tv_shows)\s+WHERE\s+' THEN
        RAISE EXCEPTION 'invalid filter query';
    END IF;
    RETURN QUERY EXECUTE p_sql;
END $$;
```

- [ ] **Step 3: Register service in module**

```ts
// apps/api/src/smart-search/smart-search.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { KeywordSearchService } from './keyword-search.service';
import { VectorSearchService } from './vector-search.service';
import { QueryExtractorService } from './query-extractor.service';
import { SmartSearchService } from './smart-search.service';

@Module({
    imports: [RedisModule],
    providers: [KeywordSearchService, VectorSearchService, QueryExtractorService, SmartSearchService],
    exports: [SmartSearchService],
})
export class SmartSearchModule {}
```

- [ ] **Step 4: Re-apply migration and run all unit tests**

```bash
cd /home/user/Projects/movie-recommendr
supabase db reset --debug
cd apps/api && npx jest src/smart-search/__tests__/
```

Expected: all unit tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/smart-search/ supabase/migrations/<TIMESTAMP>_add_search_vectors.sql
git commit -m "feat(smart-search): orchestrator with filter pre-step, RRF, soft-relax, exclusions, hydrate"
```

---

## Task 10: Integration test against seeded test DB

**Files:**
- Create: `apps/api/src/smart-search/__tests__/smart-search.service.spec.ts`
- Create: `apps/api/src/smart-search/__tests__/fixtures/seed.sql` (small movie/tv fixture)

- [ ] **Step 1: Write fixture seed SQL**

```sql
-- apps/api/src/smart-search/__tests__/fixtures/seed.sql
-- ~10 movies + ~5 tv shows for integration test. IDs deliberately distinct.

INSERT INTO public.movies (id, title, description, genres, release_date, vote_average, runtime, original_language, embedding, movie_cast, crew, keywords)
VALUES
  (9001, 'Groundhog Day', 'A weatherman is trapped in a time loop.', ARRAY['Comedy','Fantasy'], '1993-02-12', 8.0, 101, 'en',
   array_fill(0.01::float, ARRAY[1536])::vector,
   '[{"name":"Bill Murray","character":"Phil"}]'::jsonb,
   '[{"name":"Harold Ramis","job":"Director"}]'::jsonb,
   ARRAY['time loop','comedy']),
  (9002, 'Lost in Translation', 'An aging actor and a young woman meet in Tokyo.', ARRAY['Drama'], '2003-09-12', 7.7, 102, 'en',
   array_fill(0.02::float, ARRAY[1536])::vector,
   '[{"name":"Bill Murray","character":"Bob"}]'::jsonb,
   '[{"name":"Sofia Coppola","job":"Director"}]'::jsonb,
   ARRAY['loneliness']),
  (9003, 'Fight Club', 'A man forms a fight club.', ARRAY['Drama','Thriller'], '1999-10-15', 8.4, 139, 'en',
   array_fill(0.03::float, ARRAY[1536])::vector,
   '[{"name":"Brad Pitt","character":"Tyler"}]'::jsonb,
   '[{"name":"David Fincher","job":"Director"}]'::jsonb,
   ARRAY['violence']),
  (9004, 'Se7en', 'Two detectives chase a serial killer.', ARRAY['Thriller','Crime'], '1995-09-22', 8.6, 127, 'en',
   array_fill(0.04::float, ARRAY[1536])::vector,
   '[{"name":"Brad Pitt"}]'::jsonb,
   '[{"name":"David Fincher","job":"Director"}]'::jsonb,
   ARRAY['serial killer']),
  (9005, 'The Royal Tenenbaums', 'A dysfunctional family reunites.', ARRAY['Comedy','Drama'], '2001-12-14', 7.6, 110, 'en',
   array_fill(0.05::float, ARRAY[1536])::vector,
   '[]'::jsonb, '[{"name":"Wes Anderson","job":"Director"}]'::jsonb,
   ARRAY['family']),
  (9006, 'Inception', 'A thief enters dreams.', ARRAY['Sci-Fi','Action'], '2010-07-16', 8.8, 148, 'en',
   array_fill(0.06::float, ARRAY[1536])::vector,
   '[{"name":"Leonardo DiCaprio"}]'::jsonb,
   '[{"name":"Christopher Nolan","job":"Director"}]'::jsonb,
   ARRAY['dream']),
  (9007, 'Scrooged', 'A cynical TV exec is haunted.', ARRAY['Comedy','Fantasy'], '1988-11-23', 6.9, 101, 'en',
   array_fill(0.07::float, ARRAY[1536])::vector,
   '[{"name":"Bill Murray"}]'::jsonb,
   '[{"name":"Richard Donner","job":"Director"}]'::jsonb,
   ARRAY['christmas']);
-- (extend to 10 if needed; tv_shows similar)
```

(Fill in to ~10 movies and a small tv_shows set similarly. The exact numbers don't matter much — what matters is having representative coverage.)

- [ ] **Step 2: Write integration tests**

```ts
// apps/api/src/smart-search/__tests__/smart-search.service.spec.ts
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '@repo/db';
import { SmartSearchModule } from '../smart-search.module';
import { SmartSearchService } from '../smart-search.service';

const FIXTURE_SQL = fs.readFileSync(path.join(__dirname, 'fixtures/seed.sql'), 'utf8');

describe('SmartSearchService (integration)', () => {
    let svc: SmartSearchService;

    beforeAll(async () => {
        // Seed via raw RPC. Requires `exec_sql_admin`-style call OR direct PG conn.
        // For this test, skip if SUPABASE_TEST_DB env var is not set.
        if (!process.env.SUPABASE_TEST_DB) {
            console.warn('SUPABASE_TEST_DB not set — skipping integration tests');
            return;
        }
        await (supabase.rpc as any)('exec_sql_admin', { sql: FIXTURE_SQL });

        const moduleRef = await Test.createTestingModule({
            imports: [SmartSearchModule],
        }).compile();

        svc = moduleRef.get(SmartSearchService);
    });

    const itIfDb = process.env.SUPABASE_TEST_DB ? it : it.skip;

    itIfDb('pure structural query: "комедии 90-х с Биллом Мюрреем"', async () => {
        const r = await svc.search({
            query: 'комедии 90-х с Биллом Мюрреем',
            contentType: 'movie',
            language: 'ru',
        });
        expect(r.items.some((it) => it.id === 9001)).toBe(true);  // Groundhog Day
        expect(r.meta.applied_filters.genres).toContain('comedy');
    });

    itIfDb('semantic query falls through to vector when no filters extracted', async () => {
        const r = await svc.search({
            query: 'something philosophical',
            contentType: 'movie',
            language: 'en',
        });
        expect(r.items.length).toBeGreaterThan(0);
        expect(r.meta.retrieval_mode).toBe('hybrid');
    });

    itIfDb('exclusions remove violent results when alternatives exist', async () => {
        const r = await svc.search({
            query: 'thriller without violence',
            contentType: 'movie',
            language: 'en',
        });
        expect(r.items.some((it) => it.id === 9003)).toBe(false);  // Fight Club has 'violence' keyword
    });

    itIfDb('soft-relax kicks in when filters yield empty', async () => {
        const r = await svc.search({
            query: 'sci-fi 2050+',
            contentType: 'movie',
            language: 'en',
        });
        expect(r.meta.relaxed).toBe(true);
    });

    itIfDb('mixed contentType returns items from both tables', async () => {
        const r = await svc.search({
            query: 'something',
            contentType: 'mixed',
            language: 'en',
        });
        const types = new Set(r.items.map((it) => it.content_type));
        expect(types.size).toBeGreaterThan(0);  // at least one type present
    });
});
```

- [ ] **Step 3: Run integration tests**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
SUPABASE_TEST_DB=1 npx jest src/smart-search/__tests__/smart-search.service.spec.ts
```

Expected: all 5 tests pass (or skip cleanly if env var missing).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/smart-search/__tests__/
git commit -m "test(smart-search): integration tests against seeded fixture"
```

---

## Task 11: Wire `/api/movies/search` to SmartSearchService

**Files:**
- Modify: `apps/api/src/movies/movies.controller.ts`
- Modify: `apps/api/src/movies/movies.module.ts`

- [ ] **Step 1: Read current controller `/search` handler**

```bash
grep -n "@Get\|@Post\|search" apps/api/src/movies/movies.controller.ts | head -20
```

Note exact route + method + handler name. Replace its body in next step.

- [ ] **Step 2: Replace handler body**

Find the existing search handler and replace with:

```ts
// apps/api/src/movies/movies.controller.ts
import { SmartSearchService } from '../smart-search/smart-search.service';
import type { Language } from '../smart-search/smart-search.types';

// in constructor, add:
//   private readonly smartSearch: SmartSearchService,

@Get('search')
async search(@Query('q') query: string, @Query('language') language: string = 'en', @Query('limit') limit?: string) {
    if (!query?.trim()) {
        return { items: [], meta: null };
    }
    const lang = (['en', 'ru', 'uk'].includes(language) ? language : 'en') as Language;
    const lim = limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20;
    return this.smartSearch.search({
        query: query.trim(),
        contentType: 'movie',
        language: lang,
        limit: lim,
    });
}
```

(If the existing route is `POST` instead of `GET`, mirror that. Match the existing query/body shape so the frontend still calls a valid URL — the response shape changes, the request shape stays.)

- [ ] **Step 3: Add SmartSearchModule to MoviesModule imports**

```ts
// apps/api/src/movies/movies.module.ts
import { SmartSearchModule } from '../smart-search/smart-search.module';

@Module({
    imports: [
        // ... existing ...
        SmartSearchModule,
    ],
    // ...
})
export class MoviesModule {}
```

- [ ] **Step 4: Type-check + boot the API locally**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
npx tsc --noEmit
pnpm dev
```

In another shell:

```bash
curl 'http://localhost:3001/api/movies/search?q=comedies%20from%20the%2090s%20with%20Bill%20Murray&language=en'
```

Expected: JSON `{ items: [...], meta: { extracted_filters: {...}, ... } }` with at least one movie.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/movies/movies.controller.ts apps/api/src/movies/movies.module.ts
git commit -m "feat(movies): /search uses SmartSearchService"
```

---

## Task 12: Wire `/api/tv-shows/search` to SmartSearchService

**Files:**
- Modify: `apps/api/src/tv-shows/tv-shows.controller.ts`
- Modify: `apps/api/src/tv-shows/tv-shows.module.ts`

- [ ] **Step 1: Mirror Task 11**

Same pattern as Task 11. Replace the existing `/search` handler with one that calls `this.smartSearch.search({ ..., contentType: 'tv_show' })`. Add `SmartSearchModule` to `TvShowsModule.imports`.

- [ ] **Step 2: Type-check + smoke test**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
npx tsc --noEmit
curl 'http://localhost:3001/api/tv-shows/search?q=детективы%20с%20высоким%20рейтингом&language=ru'
```

Expected: JSON with `items` and `meta`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/tv-shows/tv-shows.controller.ts apps/api/src/tv-shows/tv-shows.module.ts
git commit -m "feat(tv-shows): /search uses SmartSearchService"
```

---

## Task 13: Refactor ChatService to use SmartSearchService

**Files:**
- Modify: `apps/api/src/chat/chat.service.ts`
- Modify: `apps/api/src/chat/chat.module.ts`

- [ ] **Step 1: Add `SmartSearchModule` to ChatModule**

```ts
// apps/api/src/chat/chat.module.ts
import { SmartSearchModule } from '../smart-search/smart-search.module';

@Module({
    imports: [
        // ... existing ...
        SmartSearchModule,
    ],
    // ...
})
export class ChatModule {}
```

- [ ] **Step 2: Replace retrieval block in ChatService.sendMessage**

Find the block in `chat.service.ts` (~lines 80-120 in current main):
```ts
const queryEmbedding = await generateEmbedding(dto.message);
const { data: relevantMovies, error: searchError } = await (supabase.rpc as any)(
    'match_movies', { query_embedding: JSON.stringify(queryEmbedding), match_count: 10 }
);
```

Replace with:

```ts
import { SmartSearchService } from '../smart-search/smart-search.service';
import type { Language } from '../smart-search/smart-search.types';

// inject in constructor
constructor(private readonly smartSearch: SmartSearchService) {}

// inside sendMessage (rough structure — preserve neighbouring lines)
const lang = (dto.language && ['en', 'ru', 'uk'].includes(dto.language) ? dto.language : 'en') as Language;
const smartResult = await this.smartSearch.search({
    query: dto.message,
    contentType: 'mixed',
    language: lang,
    limit: 15,
});
const relevantMovies = smartResult.items.map((it) => ({
    id: it.id,
    title: it.title,
    description: it.description,
    genres: it.genres,
    vote_average: it.vote_average,
    similarity: it.score,
}));
```

The `relevantMovies` variable feeds the existing `MovieContext` builder downstream — keep that downstream code unchanged. Watchlist top-rated injection (`getUserPreferences`) stays where it is and is composed into the prompt context as today.

- [ ] **Step 3: Type-check + manual smoke**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
npx tsc --noEmit
# (with `pnpm dev` running)
curl -X POST http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<existing-user-uuid>","message":"посоветуй комедии 90-х"}'
```

Expected: chat returns a coherent response and `contextMovies` includes IDs from results.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/chat/chat.service.ts apps/api/src/chat/chat.module.ts
git commit -m "refactor(chat): retrieval via SmartSearchService (mixed contentType)"
```

---

## Task 14: Frontend updates for new response shape

**Files:**
- Locate: `apps/web/<call site for /api/movies/search>`
- Locate: `apps/web/<call site for /api/tv-shows/search>`

- [ ] **Step 1: Find call sites**

```bash
grep -rn "/movies/search\|/tv-shows/search" /home/user/Projects/movie-recommendr/apps/web --include="*.ts" --include="*.tsx" | head
```

- [ ] **Step 2: Update each call site**

Old expected shape: an array or `{ items }`. New shape: `{ items, meta }` where `items` is `SmartSearchItem[]` (id, content_type, title, description, poster_url, backdrop_url, genres, vote_average, score). Update the destructuring to handle the new fields. Display logic likely needs no changes (title + poster + vote_average are unchanged). The `score` field is new — ignore for now.

For each call site, change:
```ts
const data = await fetch(...).then(r => r.json());
const movies = data;  // OLD
```
to:
```ts
const data = await fetch(...).then(r => r.json());
const movies = data.items ?? [];  // NEW
```

If TypeScript types in `apps/web/lib/api/...` reference an old schema, update those interfaces.

- [ ] **Step 3: Run frontend, manual verify**

```bash
cd /home/user/Projects/movie-recommendr/apps/web && pnpm dev
```

Open the discover page in browser, type a search, confirm results render.

- [ ] **Step 4: Commit**

```bash
git add apps/web/
git commit -m "feat(web): update search call sites for new SmartSearchService response shape"
```

---

## Task 15: Run backfill on dev DB and smoke test

- [ ] **Step 1: Backfill movies + tv_shows in dev**

```bash
cd /home/user/Projects/movie-recommendr/apps/api
npx tsx src/scripts/backfill-search-vectors.ts
```

Expected: progress lines, completion message for both tables.

- [ ] **Step 2: Manual smoke (5 NL queries per language)**

For each language EN/RU/UK, run via the API and eyeball:

```bash
# EN
curl 'http://localhost:3001/api/movies/search?q=comedies%20from%20the%2090s%20with%20Bill%20Murray&language=en'
curl 'http://localhost:3001/api/movies/search?q=dark%20thrillers%20by%20Fincher&language=en'
curl 'http://localhost:3001/api/movies/search?q=something%20like%20Inception%20but%20funnier&language=en'
curl 'http://localhost:3001/api/movies/search?q=feel-good%20movies%20without%20violence&language=en'
curl 'http://localhost:3001/api/movies/search?q=sci-fi%202010%2B&language=en'

# RU
curl 'http://localhost:3001/api/movies/search?q=%D1%82%D1%80%D0%B8%D0%BB%D0%BB%D0%B5%D1%80%D1%8B%20%D0%9D%D0%BE%D0%BB%D0%B0%D0%BD%D0%B0&language=ru'
# ... 4 more

# UK
# ... 5 queries
```

Expected: each returns `items` with relevant results, `meta.retrieval_mode` mostly `hybrid`, `meta.extracted_filters` shows reasonable extraction.

- [ ] **Step 3: Optional cleanup commit (no code changes — just sanity)**

```bash
git status   # should be clean
```

---

## Self-review notes (post-write)

- Spec section "Goals" → covered by Tasks 3-13.
- Spec section "Module layout" → Task 3 + service files added in Tasks 6-9.
- Spec "DB schema changes" → Task 1.
- Spec "Backfill" → Task 2 + Task 15.
- Spec "LLM extraction" → Task 8.
- Spec "Filter builder" → Task 5 (refactored in Task 9 step 3).
- Spec "RRF" → Task 4.
- Spec "API contract" → Task 11 + Task 12.
- Spec "Chat module refactor" → Task 13.
- Spec "Caching (extraction 24h, full result 5min)" → Task 8 + Task 9.
- Spec "Failure handling matrix" → Task 9 (orchestrator handles each case).
- Spec "Tests" → Tasks 4, 5, 8, 10.
- Spec "Migration & rollout" → Tasks 1, 2, 11, 12, 13, 14, 15 ordered to match deploy steps.
- Spec "Success criteria" → Task 15 step 2 (manual smoke); p95 latency check is a manual observation in the same step.

**Resolved schema/route facts (no need to re-discover):**
- `tv_shows.tv_cast` (JSONB array) and `tv_shows.crew` (JSONB array) — confirmed in `20260111000001_add_tv_shows.sql`. `FIELDS.tv_show.castColumn = 'tv_cast'`.
- Existing routes (both GET): `/api/movies/search?q=...&limit=...&language=...` and `/api/tv-shows/search?q=...&limit=...&offset=...&language=...`. Mirror the GET shape in the new handlers; the response body is what changes.
- `MoviesController` has `MAX_LIMIT = 50` and `parseLimit` helper. New handler should reuse them.
- Movie autocomplete + tv-shows autocomplete remain untouched (per spec).

**Open implementation flags (resolve during execution, not blocking):**
- `exec_sql_admin` RPC for the integration test seeder — Task 10 assumes one exists or skips. If missing, replace the seed call with a direct SQL execution via the Supabase admin API or a separate connection. Not blocking unit tests.
