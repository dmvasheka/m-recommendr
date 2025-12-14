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

## Day 1 — Database & TMDB Ingest ✅ Complete

**Goals:** Create Supabase tables, setup TMDB integration, import movies

**Completed:**
- ✅ Supabase migrations (pgvector, tables, SQL functions)
- ✅ TMDB Service (search, details, popular, import)
- ✅ packages/db with Supabase client & TypeScript types
- ✅ 6 TMDB API endpoints working

---

## Day 2 — Embeddings & Vector Search ✅ Complete

**Goals:** Generate embeddings, implement semantic search

**Completed:**
- ✅ packages/ai with OpenAI integration
- ✅ Embeddings service (single & batch generation)
- ✅ Movies module with semantic search
- ✅ Vector search RPC functions (match_movies, get_similar_movies)
- ✅ 7 new API endpoints (embeddings + movies)

---

## Day 3 — Watchlist & Recommendations ✅ Complete

**Goals:** User watchlist and personalized recommendations

**Completed:**
- ✅ Watchlist module (add, mark watched, rating)
- ✅ Recommendations module (personalized, hybrid, popular)
- ✅ User profile embeddings with auto-update triggers
- ✅ 8 new API endpoints (watchlist + recommendations)
- ✅ Total: 21 working API endpoints

---

## Day 4-5 — Frontend Foundation 🎯 NEXT

**Goals:** Build Next.js UI, connect to backend APIs

**Tasks:**
1. **Supabase Auth Setup**
   - Login & signup pages
   - Protected routes middleware
   - User session management
   - Auth context provider

2. **Core Pages**
   - `/` - Landing page with hero & features
   - `/discover` - Movie discovery with semantic search
   - `/movies/[id]` - Movie details page
   - `/profile` - User profile & settings

3. **Shared Components (packages/ui)**
   - MovieCard component
   - SearchBar with debouncing
   - WatchlistButton (add/remove)
   - RatingStars component
   - LoadingSpinner & ErrorBoundary

4. **API Integration**
   - React Query / SWR for data fetching
   - API client with typed endpoints
   - Error handling & loading states
   - Optimistic updates for watchlist

**Deliverables:**
- Working frontend with auth
- Semantic search interface
- Movie browsing & details
- Basic UI/UX polish with Tailwind

---

## Day 6 — Frontend: Watchlist & Recommendations

**Goals:** Complete user-facing features

**Tasks:**
1. **Watchlist Page** (`/watchlist`)
   - Tabs: Planned / Watched
   - Rating interface (1-10)
   - Remove from watchlist
   - Empty states

2. **Recommendations Page** (`/recommendations`)
   - Personalized recommendations display
   - "Similar Movies" sections
   - Hybrid ranking toggle (optional)
   - Refresh recommendations button

3. **Movie Details Enhancements**
   - "Similar Movies" carousel
   - Add to watchlist button
   - Rating widget (if watched)
   - TMDB metadata display

**Deliverables:**
- Complete MVP frontend
- All 21 API endpoints integrated
- End-to-end user flow working

---

## Day 7 — Background Jobs & Queue System

**Goals:** BullMQ setup for async processing

**Tasks:**
1. **BullMQ Setup**
   - Install BullMQ + Redis client
   - Queue configuration module
   - Worker processes setup

2. **Embedding Generation Jobs**
   - Job: `generate-movie-embeddings`
   - Automatic trigger on movie import
   - Batch processing with progress tracking
   - Retry logic for failures

3. **Scheduled Jobs**
   - Cron: Import popular movies (daily)
   - Cron: Update user profiles (hourly)
   - Job: Cleanup old cache entries

4. **Job Monitoring** (optional)
   - Bull Board dashboard
   - Job status endpoints
   - Failure notifications

**Deliverables:**
- Production-ready background processing
- Automatic embedding generation
- Scheduled TMDB imports

---

## Day 8 — Caching & Performance

**Goals:** Redis caching, rate limiting, advanced features

**Tasks:**
1. **Redis Caching Layer**
   - Cache search results (5 min TTL)
   - Cache recommendations by user_id (15 min TTL)
   - Cache movie details (1 hour TTL)
   - Cache invalidation on updates

2. **API Improvements**
   - Rate limiting (100 req/15min per IP)
   - Request throttling for expensive operations
   - Pagination improvements (cursor-based)

3. **Advanced Search Filters**
   - Filter by genre
   - Filter by year range
   - Filter by rating (min/max)
   - Sort by popularity/rating/release date

4. **Performance Optimization**
   - Database query optimization
   - N+1 query prevention
   - Response compression

**Deliverables:**
- Faster API responses
- Production-ready caching
- Advanced filtering in UI

---

## Day 9-10 — RAG Pipeline: Documents & Embedding

**Goals:** Setup document storage and retrieval system

**Tasks:**
1. **Database Schema**
   ```sql
   create table documents (
     id uuid primary key,
     movie_id bigint references movies(id),
     content text,
     chunk_index int,
     source text, -- 'description', 'review', 'article', 'trivia'
     embedding vector(1536),
     metadata jsonb
   );
   ```

2. **Document Processing Service**
   - Fetch reviews from TMDB
   - Text chunking (max 512 tokens)
   - Generate embeddings per chunk
   - Store in documents table

3. **Document Import Jobs**
   - BullMQ job: process movie documents
   - Batch import for existing movies
   - Automatic processing for new movies

4. **Vector Search for Documents**
   ```sql
   create function match_documents(
     query_embedding vector(1536),
     match_count int,
     filter_movie_ids bigint[]
   ) returns table (...)
   ```

**Deliverables:**
- Documents table with vector search
- Review/article chunks with embeddings
- Document retrieval functions

---

## Day 11 — RAG Pipeline: LLM Integration

**Goals:** Implement RAG endpoint with GPT-4

**Tasks:**
1. **LLM Service** (packages/ai)
   - GPT-4 client setup
   - Prompt templates for recommendations
   - Structured output with Zod validation
   - Token usage tracking

2. **Query Router**
   ```typescript
   route(query: string): 'fast' | 'rag' {
     // Simple query → fast vector search
     // Complex/NL query → RAG with LLM
     return detectComplexity(query);
   }
   ```

3. **RAG Recommendation Service**
   - POST `/api/recommendations/query`
   - Steps:
     1. Generate query embedding
     2. Retrieve relevant documents (top 10)
     3. Build context for LLM
     4. Generate recommendations with reasoning
     5. Return structured response

4. **Response Schema**
   ```typescript
   {
     recommendations: [{
       movie_id: number,
       title: string,
       reason: string,
       citations: string[]
     }],
     explanation: string,
     mode: 'fast' | 'rag'
   }
   ```

**Deliverables:**
- Working RAG endpoint
- LLM-powered natural language queries
- Automatic routing (fast vs RAG)

---

## Day 12 — RAG UI & User Experience

**Goals:** Natural language search interface

**Tasks:**
1. **NL Search Component**
   - Large search box for complex queries
   - Example prompts ("Movies like Inception but funnier")
   - Query suggestions

2. **RAG Results Display**
   - Show LLM explanation
   - Display reasoning per movie
   - Show citations from reviews
   - "Why this movie?" tooltips

3. **Mode Comparison** (optional)
   - Toggle: Fast vs RAG results
   - Side-by-side comparison
   - Performance metrics display

4. **User Feedback**
   - Thumbs up/down on recommendations
   - Save feedback for future improvements

**Deliverables:**
- Beautiful NL search interface
- RAG explanations in UI
- Complete user experience

---

## Day 13 — Testing & Optimization

**Goals:** End-to-end testing, metrics, tuning

**Tasks:**
1. **Automated Testing**
   - API endpoint tests (Jest)
   - Frontend E2E tests (Playwright)
   - Vector search accuracy tests

2. **Evaluation Metrics**
   - Precision@5, Recall@10
   - User satisfaction tracking
   - LLM response quality metrics

3. **Performance Tuning**
   - Optimize vector search parameters
   - Tune similarity thresholds
   - A/B test fast vs RAG modes
   - Fine-tune hybrid ranking weights

4. **MMR Diversification** (optional)
   ```typescript
   score = λ * relevance - (1-λ) * maxSimilarity
   ```

**Deliverables:**
- Test coverage > 80%
- Performance benchmarks
- Optimized parameters

---

## Day 14 — Deploy & Production

**Goals:** Deploy to production, monitoring, CI/CD

**Tasks:**
1. **Deployment**
   - Frontend: Vercel (Next.js)
   - API: Railway or Render (NestJS)
   - Database: Supabase Cloud
   - Redis: Upstash
   - Object Storage: Supabase Storage (if needed)

2. **CI/CD Pipeline**
   - GitHub Actions
   - Turbo caching
   - Automated tests on PR
   - Deploy preview environments

3. **Monitoring & Logging**
   - Request logging (Winston)
   - LLM call tracking (tokens, cost, latency)
   - Error tracking (Sentry)
   - Performance monitoring
   - RAG trace debugging

4. **Documentation**
   - API documentation (Swagger)
   - Deployment guide
   - Environment variables guide
   - Contributing guidelines

**Deliverables:**
- Live production app
- Monitoring dashboard
- Complete documentation
- CI/CD pipeline

---

## MVP Priorities

**Must Have:** Auth, search, watchlist, embeddings, fast recommender, simple RAG
**Should Have:** Profile embeddings, NL queries, citations
**Nice to Have:** Trakt, metrics, MMR, A/B testing

**Success Metrics:** Precision@5 > 0.6, P95 < 2s (fast) / 5s (RAG), mobile-friendly
