# Movie Recommendr 🎬

> AI-powered movie recommendation system with RAG, embeddings, and personalized suggestions

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.1-red)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-purple)](https://openai.com/)

## About

Movie Recommendr is a portfolio project built to master AI integration and modern web technologies:

- **RAG (Retrieval-Augmented Generation)** for intelligent recommendations
- **Vector Embeddings** for similarity search
- **User Profile Embeddings** for personalization
- **LLM Router** (small → big) for cost optimization
- **Natural Language Queries** - ask for movies in plain English
- **Mobile-friendly UI** built with Next.js + Tailwind

### Key Features

- 🔍 **Smart Search** - find movies with intelligent suggestions
- 📝 **Watchlist** - plan what to watch next
- ✅ **Watched Tracking** - mark watched movies with ratings
- 🤖 **AI Recommendations** - personalized suggestions based on your taste
- 💬 **Natural Language** - "Find something like Inception but lighter"
- 📊 **Profile Analysis** - system learns your preferences over time

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Mobile / Web (Next.js)                 │
│                                                     │
│  Frontend: discovery, watchlist, watched            │
│  Auth: Supabase Auth                               │
└─────────────────┬───────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────┐
│              Backend API (NestJS)                   │
│                                                     │
│  • Auth & Users                                    │
│  • Ingest (TMDB / Trakt sync)                      │
│  • Documents / Metadata store                      │
│  • Embedding pipeline                              │
│  • Recommender service (hybrid)                    │
│  • RAG endpoint (complex queries)                  │
│  • Jobs queue (BullMQ)                             │
└────┬────────┬──────────┬────────────┬──────────────┘
     │        │          │            │
     ↓        ↓          ↓            ↓
┌─────────┬──────────┬────────┬─────────────────┐
│ Postgres│ pgvector │ Redis  │ OpenAI / LLMs   │
│(Supabase)│ (search) │(Upstash)│(embeddings)    │
│         │          │        │                 │
│ users   │          │        │ TMDB API        │
│ movies  │          │        │ Trakt API       │
│ watches │          │        │                 │
└─────────┴──────────┴────────┴─────────────────┘
```

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Auth:** Supabase Auth (client-side)
- **State:** React Context + hooks

### Backend
- **Framework:** NestJS
- **Database:** PostgreSQL (Supabase)
- **Vector Search:** pgvector extension
- **Cache:** Redis (Upstash)
- **Queue:** BullMQ

### AI/ML
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)
- **LLM:** GPT-4 Turbo / GPT-4.1-mini
- **RAG:** Custom pipeline with citation support
- **Vector DB:** pgvector (in Postgres)

### External APIs
- **TMDB:** Movie metadata, search, details
- **Trakt:** (optional) Watch history sync

### Monorepo
- **Tool:** Turborepo
- **Package Manager:** pnpm
- **Language:** TypeScript (strict mode)

---

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0
- Supabase account
- TMDB API key
- OpenAI API key

### 1. Install Dependencies

```bash
# Clone repository
git clone <your-repo-url>
cd movie-recommendr

# Install dependencies
pnpm install
```

### 2. Configure Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit .env and fill in:
# - SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
# - TMDB_API_KEY
# - OPENAI_API_KEY
# - REDIS_URL (optional, for production)
```

### 3. Setup Supabase

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Initialize
supabase init

# Apply migrations (when created)
supabase db push
```

### 4. Run Development Server

```bash
# Run all apps
pnpm dev

# Or separately:
pnpm --filter api dev      # API at http://localhost:3001
pnpm --filter web dev      # Web at http://localhost:3000
```

---

## Development Workflow

### Turborepo Commands

```bash
# Development
pnpm dev                    # Run all apps in dev mode
pnpm --filter api dev       # API only
pnpm --filter web dev       # Frontend only

# Build
pnpm build                  # Build all apps

# Lint & Type Check
pnpm lint                   # Lint all code
pnpm check-types            # TypeScript type checking

# Format
pnpm format                 # Prettier format all files
```

---

## Roadmap

Project follows a detailed 14-day development plan. See [ROADMAP.md](./ROADMAP.md)

### Current Progress

- ✅ **Day 0:** Monorepo setup, project structure, documentation
- ⏳ **Day 1:** Database setup, tables, TMDB integration
- 🔲 **Day 2-14:** See ROADMAP.md

Full progress: [CURRENT_STATUS.md](./CURRENT_STATUS.md)

---

## Learning Goals

This project is built to learn:

- ✅ **Monorepo architecture** with Turborepo
- 🧠 **Vector embeddings** and similarity search
- 🤖 **RAG** (Retrieval-Augmented Generation)
- 🔌 **LLM integration** (OpenAI API)
- 🗄️ **Vector databases** (pgvector)
- 🏗️ **NestJS** modular architecture
- ⚛️ **Next.js 14** App Router
- 🔐 **Supabase** Auth + Database
- 📊 **BullMQ** job queues
- 🎨 **Tailwind CSS** responsive UI

---

## License

MIT

---

## Acknowledgments

- [TMDB API](https://www.themoviedb.org/) for movie data
- [OpenAI](https://openai.com/) for embeddings and LLM API
- [Supabase](https://supabase.com/) for Postgres + Auth
- [Vercel](https://vercel.com/) for Turborepo

---

**Project Status:** 🚧 In Development (Day 0 completed)

See [CURRENT_STATUS.md](./CURRENT_STATUS.md) for detailed progress.
