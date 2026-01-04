/**
 * Mood/Theme Detection for Movie Recommendations
 */

export interface MoodKeywords {
    mood: string;
    keywords: string[];
    genres: string[];
}

/**
 * Mood dictionary mapping moods to keywords and genres
 */
export const MOOD_DICTIONARY: MoodKeywords[] = [
    {
        mood: 'uplifting',
        keywords: ['inspiring', 'uplifting', 'positive', 'heartwarming', 'feel-good', 'motivational', 'hopeful'],
        genres: ['Drama', 'Family', 'Romance', 'Adventure'],
    },
    {
        mood: 'dark',
        keywords: ['dark', 'grim', 'noir', 'disturbing', 'twisted', 'psychological', 'bleak'],
        genres: ['Thriller', 'Horror', 'Crime', 'Mystery'],
    },
    {
        mood: 'intense',
        keywords: ['intense', 'thrilling', 'suspenseful', 'gripping', 'edge-of-your-seat', 'action-packed'],
        genres: ['Action', 'Thriller', 'War', 'Crime'],
    },
    {
        mood: 'light',
        keywords: ['light', 'fun', 'entertaining', 'casual', 'easy-going', 'relaxing'],
        genres: ['Comedy', 'Romance', 'Animation', 'Family'],
    },
    {
        mood: 'emotional',
        keywords: ['emotional', 'touching', 'moving', 'tearjerker', 'heartfelt', 'poignant'],
        genres: ['Drama', 'Romance', 'Family'],
    },
    {
        mood: 'cerebral',
        keywords: ['mind-bending', 'thought-provoking', 'complex', 'intellectual', 'cerebral', 'philosophical'],
        genres: ['Science Fiction', 'Thriller', 'Mystery', 'Drama'],
    },
    {
        mood: 'scary',
        keywords: ['scary', 'terrifying', 'creepy', 'horrifying', 'frightening', 'eerie'],
        genres: ['Horror', 'Thriller'],
    },
    {
        mood: 'epic',
        keywords: ['epic', 'grand', 'spectacular', 'sweeping', 'monumental', 'legendary'],
        genres: ['Adventure', 'Fantasy', 'Action', 'War'],
    },
];

/**
 * Detect mood from user query
 */
export function detectMood(query: string): MoodKeywords | null {
    const lowerQuery = query.toLowerCase();

    // Check each mood's keywords
    for (const moodEntry of MOOD_DICTIONARY) {
        for (const keyword of moodEntry.keywords) {
            if (lowerQuery.includes(keyword)) {
                return moodEntry;
            }
        }
    }

    return null;
}

/**
 * Score a movie based on mood match
 * Returns 0-1 score (higher = better match)
 */
export function scoreMoodMatch(
    movie: { genres: string[] | null; keywords: string[] | null },
    detectedMood: MoodKeywords
): number {
    let score = 0;
    const movieGenres = movie.genres || [];
    const movieKeywords = movie.keywords || [];

    // Genre match (weight: 0.6)
    const genreMatches = movieGenres.filter(g =>
        detectedMood.genres.some(mg => g.includes(mg))
    ).length;
    score += (genreMatches / Math.max(detectedMood.genres.length, 1)) * 0.6;

    // Keyword match (weight: 0.4)
    const keywordMatches = movieKeywords.filter(k =>
        detectedMood.keywords.some(mk => k.toLowerCase().includes(mk))
    ).length;
    score += (keywordMatches / Math.max(detectedMood.keywords.length, 1)) * 0.4;

    return Math.min(score, 1.0); // Cap at 1.0
}
