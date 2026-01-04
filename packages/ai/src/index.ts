export { openai, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, CHAT_MODEL_SMALL, CHAT_MODEL_LARGE, GPT4O_MINI_MODEL, GPT4_MODEL } from
        './openai.client';
export { generateEmbedding, generateEmbeddingsBatch, createMovieEmbeddingText } from
        './embeddings';
export { generateChatResponse, summarizeMovie, generateMovieExplanation } from './chat';
export type { ChatMessage, MovieContext, UserPreferences } from './chat';
export {
    detectMood,
    scoreMoodMatch,
    MOOD_DICTIONARY,
    type MoodKeywords
} from './mood-detector';


