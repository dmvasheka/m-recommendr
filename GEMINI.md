# Movie Recommendr - AI Context & Guidelines

## 1. Project Overview
**Name:** Movie Recommendr
**Description:** A movie recommendation platform using RAG (Retrieval-Augmented Generation), vector embeddings, and LLM-based reasoning.
**Architecture:** Monorepo using Turborepo.

## 2. Tech Stack

### Core
- **Package Manager:** pnpm
- **Monorepo:** Turborepo
- **Languages:** TypeScript (Strict), SQL

### Frontend (`apps/web`)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Auth:** Supabase Auth
- **Localization:** next-intl (English/Russian)
- **State/Fetching:** React Query / SWR

### Backend (`apps/api`)
- **Framework:** NestJS
- **Database ORM:** Direct SQL / Supabase Client (avoiding heavy ORMs for vector ops)
- **Background Jobs:** BullMQ + Redis
- **AI/LLM:** OpenAI (text-embedding-3-small, GPT-4)

### Infrastructure & Database
- **Database:** Supabase (PostgreSQL)
- **Vector Search:** pgvector
- **Search Method:** Hybrid (SQL `ILIKE` for autocomplete, Vector Cosine Similarity for semantic search)

## 3. Current Status (as of Jan 2026)
- **Completed:**
  - Core Infrastructure (Monorepo, Supabase, Auth).
  - TMDB Data Import (Top 40 movies/year 1990-2024).
  - Vector Embeddings (100% coverage).
  - Localization (EN/RU).
  - Basic Search & Autocomplete.
- **In Progress:**
  - "Why This Movie?" UI (LLM explanation).
  - Advanced Search Filters (Genre, Year, Rating).

## 4. Key Conventions

### Coding Style
- **TypeScript:** Strict mode. Use interfaces for DTOs.
- **Components:** Functional components. Use standard Tailwind utility classes.
- **Comments:** Explain *why*, not *what*.
- **Naming:**
  - Files: `kebab-case` (e.g., `movie-card.tsx`).
  - Classes/Components: `PascalCase`.
  - Variables/Functions: `camelCase`.

### Localization
- All user-facing text must be localized using `next-intl`.
- Keys are stored in `apps/web/messages/{en,ru}.json`.
- Routes are prefixed `/[locale]/...`.

### Database
- Use `packages/db` for shared types.
- SQL migrations in `supabase/migrations`.
- Prefer RPC calls (Postgres functions) for complex vector logic.

## 5. Directory Map
- `apps/api`: NestJS backend.
- `apps/web`: Next.js frontend.
- `packages/ai`: Shared AI logic (embeddings, OpenAI client).
- `packages/db`: Database client and types.
- `packages/ui`: Shared UI components.
