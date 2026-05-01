// Loads .env from monorepo root before any other module is imported.
// Must be the FIRST import in main.ts so process.env is populated
// before NestJS modules with top-level env reads are evaluated.
if (process.env.NODE_ENV !== 'production') {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.join(__dirname, '../../../.env') });
}