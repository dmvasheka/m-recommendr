import { z } from 'zod';

export const ExtractedFiltersSchema = z
    .object({
        genres: z.array(z.string()).optional(),
        year_min: z.number().int().nullable().optional(),
        year_max: z.number().int().nullable().optional(),
        cast: z.array(z.string()).optional(),
        directors: z.array(z.string()).optional(),
        vote_average_min: z.number().min(0).max(10).nullable().optional(),
        runtime_min: z.number().int().nullable().optional(),
        runtime_max: z.number().int().nullable().optional(),
        themes: z.array(z.string()).optional(),
        mood: z.array(z.string()).optional(),
        exclusions: z.array(z.string()).optional(),
        semantic_remainder: z.string(),
    })
    .superRefine((val, ctx) => {
        // Reject contradictory ranges from the LLM (e.g. year_min=2010, year_max=1990).
        // On failure the extractor falls back to pure hybrid search instead of running
        // a guaranteed-empty BETWEEN clause.
        if (
            val.year_min != null &&
            val.year_max != null &&
            val.year_min > val.year_max
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['year_max'],
                message: `year_min (${val.year_min}) must be <= year_max (${val.year_max})`,
            });
        }
        if (
            val.runtime_min != null &&
            val.runtime_max != null &&
            val.runtime_min > val.runtime_max
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['runtime_max'],
                message: `runtime_min (${val.runtime_min}) must be <= runtime_max (${val.runtime_max})`,
            });
        }
    });

export type ExtractedFilters = z.infer<typeof ExtractedFiltersSchema>;

export type ContentType = 'movie' | 'tv_show' | 'mixed';
export type Language = 'en' | 'ru' | 'uk';
export type LlmTier = 'mini' | 'full' | 'none';
export type RetrievalMode = 'hybrid' | 'fallback_vector_only' | 'fallback_keyword_only';

export interface SmartSearchParams {
    query: string;
    contentType: ContentType;
    language: Language;
    limit?: number;
}

export interface AppliedFilters {
    genres?: string[];
    year_min?: number;
    year_max?: number;
    cast?: string[];
    directors?: string[];
    vote_average_min?: number;
    runtime_min?: number;
    runtime_max?: number;
}

export interface SmartSearchMeta {
    extracted_filters: ExtractedFilters | null;
    applied_filters: AppliedFilters;
    relaxed: boolean;
    exclusions_skipped: boolean;
    retrieval_mode: RetrievalMode;
    llm_tier_used: LlmTier;
    latency_ms: { total: number; extraction: number; retrieval: number };
}

export interface SmartSearchItem {
    id: number;
    content_type: 'movie' | 'tv_show';
    title: string;
    description: string | null;
    poster_url: string | null;
    backdrop_url: string | null;
    genres: string[] | null;
    vote_average: number | null;
    score: number;
}

export interface SmartSearchResult {
    items: SmartSearchItem[];
    meta: SmartSearchMeta;
}

export interface RankedId {
    id: number;
    rank: number;
}
