# Movie Recommendr - Development Roadmap

## Project Goal
Portfolio project to master AI integration and LLM work - MVP in 14 days with RAG, embeddings, vector search, and LLM router.

## Tech Stack
- **Frontend:** Next.js 14, Tailwind, Supabase Auth
- **Backend:** NestJS, Postgres (Supabase), pgvector, BullMQ
- **AI:** OpenAI (text-embedding-3-small, GPT-4), RAG pipeline
- **APIs:** TMDB, Trakt (optional)

---

## Day 0 — Preparation ✅ Complete

### Done:
- ✅ Monorepo (Turborepo), apps/api (NestJS), apps/web (Next.js)
- ✅ Packages: ai, db, ui, eslint-config, typescript-config
- ✅ Documentation: README, ROADMAP, CURRENT_STATUS, .env.example

### Remaining:
- Setup Supabase project, get TMDB + OpenAI API keys, create .env

---

## Day 1 — Database & TMDB Ingest

**Goals:** Create Supabase tables, setup TMDB integration, import movies

**Tables:**
```sql
-- Enable pgvector
create extension vector;

-- Users, movies (with embedding vector(1536)), user_watchlist, user_profiles
-- Indexes: ivfflat on embeddings, popularity, vote_average
```

**TMDB Service:**
- `searchMovies(query)`, `getMovieDetails(id)`, `getPopularMovies(page)`

**packages/db:**
- Supabase client, TypeScript types

---

## Day 2 — Basic UI & Auth

- Pages: /discover, /movies/[id], /profile, /watchlist
- Supabase Auth: login, signup, protected routes

---

## Day 3 — Watchlist & Watched

- API: POST /watchlist/add, /watched, GET /watchlist, DELETE /watchlist/:id
- UI: buttons, filters (planned/watched)

---

## Day 4 — Embedding Pipeline

**Embedding Service (packages/ai):**
```typescript
async createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}
```

**Vector Search RPC:**
```sql
create function match_movies(query_embedding vector(1536), match_count int)
returns table (id bigint, title text, similarity float)
```

**Batch Job:** BullMQ to process all movies without embeddings

---

## Day 5 — Fast Recommender

**User Profile Embedding:**
- Average embeddings of watched movies (rating ≥ 7)

**Endpoint: GET /recommendations/fast**
- Vector search user profile → filter watched → rerank by popularity

---

## Day 6 — Trakt Integration (Optional)

- OAuth flow, import watch history, map Trakt → TMDB IDs

---

## Day 7 — RAG Documents

**documents table:**
```sql
create table documents (
  id uuid primary key,
  movie_id bigint references movies(id),
  content text,
  chunk_index int,
  source text, -- 'description', 'review', 'article'
  embedding vector(1536)
);
```

- Reviews from TMDB, chunking (max 512 tokens)

---

## Day 8 — Router & LLM

**Query Router:**
```typescript
route(query: string): 'fast' | 'rag' {
  return query.length < 50 && !hasQuestionWords(query) ? 'fast' : 'rag';
}
```

**LLM Service:**
- GPT-4 with json_object response format

---

## Day 9 — RAG Endpoint

**POST /recommendations/query:**
1. Create query embedding
2. Retrieve relevant documents (vector search)
3. LLM generation with context
4. Zod validation

**Output Schema:**
```typescript
{
  recommendations: [{ movie_id, title, reason, citations }],
  explanation: string
}
```

---

## Day 10 — Complex Query UI

- Natural language search box
- Display LLM explanations & citations

---

## Day 11 — MMR Diversification

Maximal Marginal Relevance for diverse results:
```typescript
score = λ * relevance - (1-λ) * maxSimilarity
```

---

## Day 12 — Metrics & Logging

- Request logging, LLM call tracking (tokens, cost, latency)
- RAG traces for debugging

---

## Day 13 — Testing & Evaluation

- Evaluation dataset, Precision@5, Recall@10
- A/B test fast vs RAG
- Tune hyperparameters

---

## Day 14 — Deploy

- Frontend: Vercel
- API: Railway/Render
- DB: Supabase cloud
- Redis: Upstash
- CI/CD: GitHub Actions, Turbo caching

---

## MVP Priorities

**Must Have:** Auth, search, watchlist, embeddings, fast recommender, simple RAG
**Should Have:** Profile embeddings, NL queries, citations
**Nice to Have:** Trakt, metrics, MMR, A/B testing

**Success Metrics:** Precision@5 > 0.6, P95 < 2s (fast) / 5s (RAG), mobile-friendly
