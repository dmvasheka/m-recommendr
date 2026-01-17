# Translation Update Scripts

Scripts for updating translations in the database for existing movies and TV shows.

## Prerequisites

- TMDB API key configured in `.env` file
- Supabase connection configured
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

## Next Steps

After updating translations:
1. ✅ Translations are stored in database
2. ⏳ Update API endpoints to accept `?lang=` parameter
3. ⏳ Update frontend to pass current locale to API
4. ⏳ Consider multilingual embeddings for search
