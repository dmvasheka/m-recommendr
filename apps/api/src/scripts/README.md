# API Scripts

Collection of scripts for managing imports, translations, and other tasks.

## Prerequisites

- TMDB API key configured in `.env` file
- Supabase connection configured
- Redis running (for BullMQ queues)
- Node.js 18+ with tsx/ts-node

## update-translations.ts

Updates translations for existing movies and TV shows in the database by fetching data from TMDB API in multiple languages (en, ru, uk).

### Usage

```bash
# Update all movies (no limit)
npx tsx src/scripts/update-translations.ts --movies

# Update all TV shows
npx tsx src/scripts/update-translations.ts --tv

# Update both movies and TV shows
npx tsx src/scripts/update-translations.ts --all

# Update with limit (e.g., 100 items)
npx tsx src/scripts/update-translations.ts --movies --limit=100

# Update with offset (for batching)
npx tsx src/scripts/update-translations.ts --movies --limit=100 --offset=100

# Recommended approach: Update in batches to monitor progress
npx tsx src/scripts/update-translations.ts --movies --limit=50
npx tsx src/scripts/update-translations.ts --movies --limit=50 --offset=50
npx tsx src/scripts/update-translations.ts --movies --limit=50 --offset=100
```

### Options

- `--movies` - Update only movies
- `--tv` - Update only TV shows
- `--all` - Update both (default if no flag specified)
- `--limit=N` - Limit number of items to update
- `--offset=N` - Skip first N items (useful for resuming)

### Rate Limiting

The script includes built-in rate limiting to respect TMDB API limits:
- **350ms** delay between movies/TV shows
- **100ms** delay between language requests
- Automatic retry with 10s delay on rate limit errors (HTTP 429)

### Example Output

```
🚀 Translation Update Script
============================
Mode: MOVIES
Limit: 5
Offset: 0
Languages: en-US, ru-RU, uk-UA
Delay: 350ms between items, 100ms between languages

🎬 Starting movie translations update...

📊 Found 5 movies to update

[1/5] Processing movie ID 637: Life Is Beautiful
  ✅ Updated with 3 translations
[2/5] Processing movie ID 278: The Shawshank Redemption
  ✅ Updated with 3 translations
...

═══════════════════════════════════════
📊 FINAL REPORT
═══════════════════════════════════════

📈 Progress Report (6.3s elapsed):
   Movies: 5 updated, 0 failed, 5 total

✅ Done!
```

### Recommended Strategy for ~1675 Movies

1. **Start with a small test batch** (10-20 movies) to verify everything works:
   ```bash
   npx tsx src/scripts/update-translations.ts --movies --limit=10
   ```

2. **Run in batches of 50-100** for better monitoring:
   ```bash
   # Batch 1
   npx tsx src/scripts/update-translations.ts --movies --limit=100

   # Batch 2 (after verifying batch 1)
   npx tsx src/scripts/update-translations.ts --movies --limit=100 --offset=100

   # And so on...
   ```

3. **Or run all at once** (will take ~15-20 minutes for 1675 movies):
   ```bash
   npx tsx src/scripts/update-translations.ts --movies
   ```

### Estimated Time

- **Per movie**: ~1.5 seconds (3 languages × 100ms + 350ms delay + API time)
- **100 movies**: ~2.5 minutes
- **1000 movies**: ~25 minutes
- **1675 movies**: ~40-45 minutes

### Troubleshooting

**Rate limit errors (429):**
- Script automatically retries with 10s delay
- If persistent, increase `DELAY_BETWEEN_MOVIES` in the script

**Connection errors:**
- Check TMDB_API_KEY in .env
- Check internet connection
- Verify Supabase connection

**Memory issues:**
- Use `--limit` to process in smaller batches
- Monitor with `top` or `htop`

## Database Schema

Translations are stored in JSONB format:

```json
{
  "en": {
    "title": "The Shawshank Redemption",
    "description": "...",
    "tagline": "Fear can hold you prisoner. Hope can set you free."
  },
  "ru": {
    "title": "Побег из Шоушенка",
    "description": "...",
    "tagline": "«Страх — это кандалы. Надежда — это свобода»"
  },
  "uk": {
    "title": "Втеча з Шоушенка",
    "description": "...",
    "tagline": "Страх триматиме вас у полоні. Надія може вас звільнити."
  }
}
```

## setup-cron.ts

Script for setting up automatic rotational import schedules using cron expressions.

### What is Rotational Import?

Rotational import automatically cycles through different TMDB categories to ensure diverse content:
- **Movies**: popular → top_rated → now_playing → upcoming → (repeat)
- **TV Shows**: popular → top_rated → (repeat)

Each category tracks its progress separately, preventing duplicate imports.

### Usage

**View schedule information:**
```bash
npx tsx src/scripts/setup-cron.ts
```

**Setup cron schedules:**
```bash
npx tsx src/scripts/setup-cron.ts --setup
```

### Recommended Schedules

**Movies (Rotational):**
- Frequency: Every 8 hours
- Count: 100 movies per run
- Rotation: Automatically cycles through all 4 categories
- Example: `0 */8 * * *`

**TV Shows (Rotational):**
- Frequency: Daily at 2 AM
- Count: 80 TV shows per run
- Rotation: Automatically cycles through 2 categories
- Example: `0 2 * * *`

### Alternative Schedules

```bash
# More frequent movie imports (every 6 hours)
curl -X POST http://localhost:3001/api/queues/schedule-rotational-movie-import \
  -H "Content-Type: application/json" \
  -d '{"cronExpression": "0 */6 * * *", "count": 80}'

# Less frequent movie imports (every 12 hours)
curl -X POST http://localhost:3001/api/queues/schedule-rotational-movie-import \
  -H "Content-Type: application/json" \
  -d '{"cronExpression": "0 */12 * * *", "count": 150}'

# TV shows twice daily
curl -X POST http://localhost:3001/api/queues/schedule-rotational-tv-import \
  -H "Content-Type: application/json" \
  -d '{"cronExpression": "0 2,14 * * *", "count": 50}'
```

### Manual Import Triggers

**Start a rotational import now:**
```bash
# Movies (will import from next category in rotation)
curl -X POST http://localhost:3001/api/queues/rotational-movie-import \
  -H "Content-Type: application/json" \
  -d '{"count": 50}'

# TV Shows
curl -X POST http://localhost:3001/api/queues/rotational-tv-import \
  -H "Content-Type: application/json" \
  -d '{"count": 50}'
```

### Monitoring

**Check rotation status:**
```bash
curl http://localhost:3001/api/queues/rotation-status

# Example response:
{
  "success": true,
  "rotation": {
    "movies": {
      "lastCategory": "popular",
      "nextCategory": "top_rated",
      "lastRun": "2026-01-20T00:00:00.000Z"
    },
    "tv_shows": {
      "lastCategory": "popular",
      "nextCategory": "top_rated",
      "lastRun": "2026-01-20T02:00:00.000Z"
    }
  }
}
```

**Check queue statistics:**
```bash
curl http://localhost:3001/api/queues/stats

# Example response:
{
  "success": true,
  "stats": {
    "movieImport": { "waiting": 0, "active": 1, "completed": 45, "failed": 0 },
    "tvImport": { "waiting": 2, "active": 1, "completed": 28, "failed": 0 },
    "embeddings": { "waiting": 0, "active": 0, "completed": 1675, "failed": 0 }
  }
}
```

### How It Works

1. **Category Selection**: System automatically selects next category in rotation
2. **Progress Tracking**: Each category has its own `import_progress` record tracking last imported page
3. **Duplicate Prevention**: Checks database before importing to skip existing content
4. **Smart Skip Detection**: Warns when >80% of items are skipped (all content already imported)
5. **Auto Rotation**: Next scheduled run will use the next category in rotation

### Cron Expression Reference

```
 * * * * *
 │ │ │ │ │
 │ │ │ │ └─── day of week (0-7, Sunday=0 or 7)
 │ │ │ └───── month (1-12)
 │ │ └─────── day of month (1-31)
 │ └───────── hour (0-23)
 └─────────── minute (0-59)
```

**Common Patterns:**
- `0 */6 * * *` - Every 6 hours
- `0 */8 * * *` - Every 8 hours
- `0 */12 * * *` - Every 12 hours
- `0 2 * * *` - Daily at 2 AM
- `0 2,14 * * *` - At 2 AM and 2 PM
- `0 0 * * 0` - Weekly on Sundays at midnight

### Troubleshooting

**Cron not triggering:**
1. Check Redis is running: `redis-cli ping`
2. Check server logs for BullMQ errors
3. Verify schedules: `curl http://localhost:3001/api/queues/stats`

**Too many duplicates:**
- This is normal behavior - rotational import will automatically move to next category
- Check logs for: `⚠️ Page X: All Y items skipped (duplicates)`
- Next category will have fresh content

**High API usage:**
- Reduce frequency: change from every 6h to every 12h
- Reduce count: change from 100 to 50 items per run
- Built-in rate limiting: 250ms delay between requests

### Rate Limiting

Built-in rate limiting to respect TMDB API limits:
- **250ms** delay between movie/TV show imports
- Automatic retry on API errors (3 attempts with exponential backoff)
- Progress saved after each page to prevent data loss

### Database Tables

**import_progress**:
```sql
content_type | category   | year | last_page | total_imported | total_skipped | last_run
-------------|------------|------|-----------|----------------|---------------|---------------------
movies       | popular    | NULL | 25        | 450            | 50             | 2026-01-20 08:00:00
movies       | top_rated  | NULL | 18        | 340            | 20             | 2026-01-20 00:00:00
tv_shows     | popular    | NULL | 12        | 230            | 10             | 2026-01-20 02:00:00
```

## Next Steps

After updating translations:
1. ✅ Translations are stored in database
2. ⏳ Update API endpoints to accept `?lang=` parameter
3. ⏳ Update frontend to pass current locale to API
4. ⏳ Consider multilingual embeddings for search
