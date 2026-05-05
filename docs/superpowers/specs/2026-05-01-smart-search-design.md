# Smart Search — Phase 1 of Advanced RAG roadmap

**Date:** 2026-05-01
**Author:** dmitry.vasheka (with Claude as collaborator)
**Status:** Draft — pending review
**Phase:** 1 of 4 (Advanced RAG roadmap, Approach B / visible-first)

## Context

The `movie-recommendr` chat module currently performs a single-shot vector search: query → embedding → `match_movies` top-10 → GPT-4 with that context. Search bars (`/api/movies/search`, `/api/tv-shows/search`) use simple `ILIKE`. This works but ignores structured intent inside natural-language queries ("комедии 90-х с Биллом Мюрреем") and offers no keyword recall for exact-name matches against the multilingual `translations` JSON column.

The Advanced RAG roadmap chosen by the user includes four phases: hybrid search + structured query extraction (this spec), HyDE / multi-query expansion, RAGAS evaluation, LangGraph agent. We picked Approach B (visible-first), so Phase 1 ships user-facing search improvements before measurement infrastructure.

## Goals

- One reusable backend service (`SmartSearchService`) used by `/api/movies/search`, `/api/tv-shows/search`, AND the chat module's retrieval stage.
- Hybrid retrieval: pgvector + Postgres tsvector keyword search merged via Reciprocal Rank Fusion (RRF).
- Structured query extraction: an LLM extracts ~10 fields (genres, year/range, cast, directors, vote_average min, runtime range, themes, mood, exclusions, plus a `semantic_remainder`) from the natural-language query and converts the hard fields into SQL WHERE-fragments that pre-filter the candidate set.
- Multi-language keyword search with three per-language tsvector columns (`english`, `russian` configs; `simple` for Ukrainian until a custom dictionary is added).
- Graceful failure: invalid LLM JSON → fall back to pure hybrid; empty after filters → soft-relax filters in priority order; one branch fails → the other still serves.
- Chat module refactored to call `SmartSearchService` for retrieval (mixed contentType), preserving its existing user-personalization layer (watchlist top-rated injection) on top.

## Non-goals

- HyDE / multi-query expansion (Phase 2).
- RAGAS evaluation pipeline (Phase 3).
- LangGraph agent / multi-hop retrieval (Phase 4).
- UI chips for "extracted filters" — schema supports it via `meta`, but rendering is deferred.
- "Deep search" toggle in UI (YAGNI; LLM tier is decided by internal heuristics in Phase 1).
- Touching `/api/movies/autocomplete` / `/api/tv-shows/autocomplete` (must stay <100ms; LLM extraction has no place there).
- `/api/recommendations` endpoints — separate concern.
- Custom Ukrainian text-search dictionary (TODO in code).

## Architecture overview

New module `apps/api/src/smart-search/` is the single owner of the search pipeline. `MoviesController` and `TvShowsController` delegate to it; `ChatService` calls it for the retrieval stage of every chat turn.

```
Client → MoviesController.search ──┐
Client → TvShowsController.search ─┼─→ SmartSearchService.search() ──→ ranked items + meta
ChatService.handleMessage ─────────┘
```

`SmartSearchService` is stateless with respect to the user — it owns its own caches but never reads `user_id` or watchlist data. User-personalization (watchlist bias) lives in `ChatService` and is applied on top of the items `SmartSearchService` returns.

### Module layout

```
apps/api/src/smart-search/
  smart-search.module.ts
  smart-search.service.ts          // orchestrator
  smart-search.types.ts            // Zod schemas + interfaces
  query-extractor.service.ts       // LLM extraction + caching
  filter-builder.ts                // ExtractedFilters → SQL fragments + bind values
  keyword-search.service.ts        // tsvector queries
  vector-search.service.ts         // thin wrapper over match_movies / match_tv_shows
  hybrid-merger.ts                 // RRF
  __tests__/
    rrf.spec.ts
    filter-builder.spec.ts
    query-extractor.spec.ts        // mocked LLM
    smart-search.service.spec.ts   // integration with test DB
```

## Request flow

Per `SmartSearchService.search({ query, contentType, language, limit })`:

1. **Cache check** — full-result cache key `smartsearch:<sha256(query+lang+contentType+limit)>`, TTL 5 min. Hit → return.
2. **Parallel stage A**:
   - `query-extractor.extract(query, language)` → `{ filters, semantic_remainder }` (or `null` on failure). Has its own 24h cache keyed on `extract:<sha256(query+language)>`.
   - `embeddingsService.embed(semantic_remainder ?? query)` → 1536-d vector.
3. **Apply structured filters** via `filter-builder` → `WHERE` fragment + bind params. If `filters` is null/empty → no pre-filter, all rows are candidates.
4. **Parallel stage B** (within candidate set):
   - `vector-search.match(embedding, candidate_ids, limit=50)` → ranked list by cosine.
   - `keyword-search.match(query, language, candidate_ids, limit=50)` → ranked list by `ts_rank`.
5. **RRF merge** → top-K (typically 20) with score breakdown.
6. **Soft-relax** if final list is empty after step 5 AND any structured filters were applied: drop filters in this priority (least-important first) until non-empty: `runtime_min/max` → `vote_average_min` → `year_min/max` → `genres` → `cast`/`directors` (never relaxed). Set `meta.relaxed = true`.
7. **Hydrate** — fetch full rows including the requested `language` translation.
8. **Cache write** + return `{ items, meta }`.

For `contentType: 'mixed'`: run steps 3-5 against both `movies` and `tv_shows` independently; RRF-merge the two ranked lists into one final list.

## DB schema changes

New migration `supabase/migrations/<date>_add_search_vectors.sql`:

```sql
ALTER TABLE movies
  ADD COLUMN search_vector_en tsvector,
  ADD COLUMN search_vector_ru tsvector,
  ADD COLUMN search_vector_uk tsvector;

CREATE OR REPLACE FUNCTION movies_search_vector_update() RETURNS trigger AS $$
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

CREATE TRIGGER movies_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, translations ON movies
  FOR EACH ROW EXECUTE FUNCTION movies_search_vector_update();

CREATE INDEX idx_movies_search_en ON movies USING gin(search_vector_en);
CREATE INDEX idx_movies_search_ru ON movies USING gin(search_vector_ru);
CREATE INDEX idx_movies_search_uk ON movies USING gin(search_vector_uk);

-- Ensure GIN on genres (used by filter-builder)
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies USING gin(genres);
```

Equivalent block for `tv_shows`. Backfill via a separate script (`apps/api/src/scripts/backfill-search-vectors.ts`) that runs `UPDATE ... SET title = title WHERE id BETWEEN $1 AND $2` in batches of 1000 with a 200 ms pause between batches. Run manually after migration. While backfill is incomplete, keyword search returns zero matches for un-backfilled rows; `retrieval_mode` becomes `fallback_vector_only` for affected queries — system stays usable.

## LLM extraction

### Schema (Zod)

```ts
const ExtractedFiltersSchema = z.object({
  genres: z.array(z.string()).optional(),       // e.g. ['comedy', 'thriller']
  year_min: z.number().int().nullable().optional(),
  year_max: z.number().int().nullable().optional(),
  cast: z.array(z.string()).optional(),         // actor names
  directors: z.array(z.string()).optional(),
  vote_average_min: z.number().min(0).max(10).nullable().optional(),
  runtime_min: z.number().int().nullable().optional(),
  runtime_max: z.number().int().nullable().optional(),
  themes: z.array(z.string()).optional(),       // semantic — appended to embedding text, not SQL
  mood: z.array(z.string()).optional(),         // 'sad', 'uplifting', 'dark'
  exclusions: z.array(z.string()).optional(),   // ['violence', 'horror']
  semantic_remainder: z.string(),               // residual NL after extraction; embeds for vector search
});
```

### Prompt

System prompt + 3-5 few-shot examples per language (RU, EN, UK). Uses OpenAI `response_format: { type: 'json_schema', schema: <derived from Zod> }` to guarantee a valid JSON shape.

### Model tiering (internal heuristics, no API exposure)

- Default: `gpt-4o-mini` (env: `SMART_SEARCH_EXTRACTION_MODEL_MINI`).
- Auto-escalate to `gpt-4o` (env: `SMART_SEARCH_EXTRACTION_MODEL_FULL`) when:
  - Mini returned invalid JSON → exactly one retry on full.
  - Heuristic: `query.split(/\s+/).length > 25` OR contains 2+ matches of subordinate-clause markers (regex `/(который|которая|которое|but|except|без|кроме|если|when|що|якщо)/gi`, requires `match.length >= 2`).
- Both failures (mini retried as full, still invalid) → `extracted_filters = null`, fall back to pure hybrid on raw query.

Env defaults:
```
SMART_SEARCH_EXTRACTION_MODEL_MINI=gpt-4o-mini
SMART_SEARCH_EXTRACTION_MODEL_FULL=gpt-4o
SMART_SEARCH_AUTO_ESCALATE=true
```

## Filter builder (extracted → SQL)

| Field | SQL fragment | Notes |
|---|---|---|
| `genres` | `genres && $1::text[]` | OR semantics; needs GIN on genres |
| `year_min`, `year_max` | `EXTRACT(YEAR FROM release_date) BETWEEN $1 AND $2` | both bounds optional |
| `vote_average_min` | `vote_average >= $1` | |
| `runtime_min`, `runtime_max` | `runtime BETWEEN $1 AND $2` | |
| `cast` | `EXISTS (SELECT 1 FROM jsonb_array_elements(movie_cast) c WHERE c->>'name' ILIKE ANY($1))` | uses existing GIN on movie_cast |
| `directors` | `EXISTS (SELECT 1 FROM jsonb_array_elements(crew) c WHERE c->>'job'='Director' AND c->>'name' ILIKE ANY($1))` | uses GIN on crew |
| `themes`, `mood` | (not SQL) | appended to embedding input as `… with themes of: X. mood: Y.` |
| `exclusions` | (not SQL) | post-filter on top-K: drop rows where any exclusion appears as substring (case-insensitive) in `description` or any element of `keywords`. Safety-rail: if dropping would empty the result, keep the original list and set `meta.exclusions_skipped = true` instead |

`tv_shows` mirrors this. The exact column names on `tv_shows` (cast/crew/keywords) must be verified against `supabase/migrations/20260111000001_add_tv_shows.sql` and any later additions during implementation; `filter-builder` exposes a per-content-type adapter so column-name divergence is contained without changing the public service contract.

## RRF (Reciprocal Rank Fusion)

```
score(doc) = Σ over each ranked-list i: 1 / (k + rank_i(doc))
```
with `k = 60` (standard). Documents that appear in multiple lists get additive boost; documents appearing in only one list are still ranked. No score normalization, no tunable weight. Implementation in `hybrid-merger.ts`, ~30 LoC.

## API contract

`GET /api/movies/search` and `GET /api/tv-shows/search` (matching the existing controller routes — no method change). Query parameters:

```
q=<query string>
language=en|ru|uk        // required
limit=<number>           // default 20, capped at MAX_LIMIT=50 by MoviesController
```

GET is preserved for symmetry with the existing autocomplete and details endpoints. Total URL length stays well under typical browser/proxy limits (8 KB) — `q` is bounded by user-typed input, the other params are tiny.

and return:

```ts
{
  items: MovieRow[] | TvShowRow[],   // hydrated rows including translations[language]
  meta: {
    extracted_filters: ExtractedFilters | null;
    applied_filters: { /* what made it into SQL after relax */ };
    relaxed: boolean;
    retrieval_mode: 'hybrid' | 'fallback_vector_only' | 'fallback_keyword_only';
    llm_tier_used: 'mini' | 'full' | 'none';
    latency_ms: { total: number; extraction: number; retrieval: number };
  }
}
```

Form changed from current `/search` shape — frontend updates required (1-2 call sites).

## Chat module refactor

`ChatService.handleMessage` flow becomes:

```ts
async handleMessage(userId: string, message: string) {
  const profile = await this.usersService.getProfile(userId);
  const language = profile.preferred_language ?? 'en';

  const [smartResults, watchlistTopRated] = await Promise.all([
    this.smartSearch.search({
      query: message,
      contentType: 'mixed',
      language,
      limit: 15,
    }),
    this.watchlistService.getTopRated(userId, 5),
  ]);

  const context = composeContext(smartResults.items, watchlistTopRated, history);
  const response = await this.openai.chat.complete({
    model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
    messages: [systemPrompt, ...history, { role: 'user', content: contextWithMessage }],
  });
  // save + return
}
```

Existing user-bias logic moves out of retrieval and into context composition — cleaner separation.

## Caching

| Cache | Key | TTL | Storage |
|---|---|---|---|
| Extraction | `extract:<sha256(query+language)>` | 24 h | `RedisService` (cache path) |
| Full result | `smartsearch:<sha256(query+lang+contentType+limit)>` | 5 min | `RedisService` |

Redis is the same instance as before (cache path). With queues disabled (`QUEUES_ENABLED=false`, see `chore/disable-import-queues`), Redis is already cache-only — no contention.

## Failure handling matrix

| Failure | Result |
|---|---|
| LLM extraction returns invalid JSON (mini, then full retry) | `extracted_filters = null`, `llm_tier_used = 'none'`, pure hybrid on raw query |
| LLM extraction times out (>3 s) | same as above |
| Vector search throws | `retrieval_mode = 'fallback_keyword_only'` |
| Keyword search throws | `retrieval_mode = 'fallback_vector_only'` |
| Both throw | propagate 500 to caller |
| Empty after filters | soft-relax (see Request flow step 6) |

## Tests

| Level | Coverage | File |
|---|---|---|
| Unit | RRF merge: ranked lists with overlap, no overlap, duplicates, single-list input | `__tests__/rrf.spec.ts` |
| Unit | filter-builder: each field → expected SQL fragment + bind values; edge cases (empty arrays, nulls, exclusions) | `__tests__/filter-builder.spec.ts` |
| Unit | query-extractor with mocked LLM: valid JSON happy path, invalid JSON triggers full-tier retry, both invalid returns null, cache hit avoids LLM call | `__tests__/query-extractor.spec.ts` |
| Integration | `SmartSearchService.search()` against test DB seeded with ~50 movies + 20 tv shows. 5-7 canonical queries: pure semantic, pure structural, mixed, with exclusions, soft-relax trigger | `smart-search.service.spec.ts` |
| Manual | Chat regression: 5 NL queries per language (RU/EN/UK), eyeball the results vs pre-refactor | not automated |

## Migration & rollout

1. Apply DB migration (idempotent: `IF NOT EXISTS` everywhere). Trigger created but historical rows still have NULL `search_vector_*`.
2. Deploy backend with `SmartSearchService` available but old `/search` endpoints still in place (parallel for one deploy).
3. Run backfill script in batches of 1000. Monitors `count(*) where search_vector_en is null` to track progress. ~7000 rows → ~10 minutes wall clock.
4. Switch `/api/movies/search` and `/api/tv-shows/search` to delegate to `SmartSearchService`. Deploy.
5. Deploy frontend with updated response handling (uses `items` from new shape; ignores `meta` initially).
6. Switch `ChatService.handleMessage` retrieval to `SmartSearchService`. Deploy.

Steps 4 and 6 are independent (controllers and chat module both consume the same service); step 5 is the only one with frontend coupling.

**Rollback:** revert the controller / chat-service commits — old behavior returns. The DB migration is non-destructive (new columns and indexes; safe to leave in place).

## Success criteria

- `SmartSearchService` covers `movie`, `tv_show`, `mixed` contentType.
- `/api/movies/search` and `/api/tv-shows/search` return new `{ items, meta }` shape; frontend calls updated.
- `ChatService` retrieval stage uses `SmartSearchService` (mixed).
- All unit tests pass; one integration test green against seeded fixture DB.
- Manual smoke test: 5 NL queries per language produce visibly relevant results.
- p95 latency: < 1 s cold cache, < 100 ms warm cache, on production-sized data (~7000 movies + ~ TV count at deploy time).

## Future work

- **Phase 2** — HyDE / multi-query expansion: generate a hypothetical movie description from the query, embed that, run another vector pass; merge into RRF as a third ranked list.
- **Phase 3** — RAGAS pipeline: build eval dataset (~50-100 query/expected pairs), run RAGAS metrics (faithfulness, context precision/recall, answer relevance) regularly, compare configurations.
- **Phase 4** — LangGraph agent: wrap `SmartSearchService` (and friends) as tools; build agent with multi-hop reasoning; LangSmith tracing.
- **Side track** — UI chips for `extracted_filters`, "Why this movie?" UI (already specced in `IMPROVEMENTS.md` §5.3), cleanup of unused `IMPORT_QUEUES_ENABLED` once queues come back from a separate Redis instance.
