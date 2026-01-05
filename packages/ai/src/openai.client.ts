import OpenAI from 'openai';

// Load .env from monorepo root (only in development)
if (process.env.NODE_ENV !== 'production') {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.join(__dirname, '../../../.env') });
}

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
}

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Model configuration
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export const CHAT_MODEL_SMALL = process.env.OPENAI_CHAT_MODEL_SMALL ||  'gpt-4o-mini';
export const CHAT_MODEL_LARGE = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';

// Aliases for backward compatibility
export const GPT4O_MINI_MODEL = CHAT_MODEL_SMALL;
export const GPT4_MODEL = CHAT_MODEL_LARGE;
