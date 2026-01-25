import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import type { UserWatchlist, Database } from '@repo/db';

export interface WatchlistItem extends Omit<UserWatchlist,
    'user_id'> {
    movie?: {
        id: number;
        title: string;
        description: string | null;
        poster_url: string | null;
        backdrop_url: string | null;
        vote_average: number | null;
        release_date: string | null;
    };
}

export interface AddToWatchlistDto {
    user_id: string;
    movie_id?: number;
    content_type?: 'movie' | 'tv_show';
    content_id?: number;
    status?: 'planned' | 'watched';
}

export interface MarkAsWatchedDto {
    user_id: string;
    movie_id?: number;
    content_type?: 'movie' | 'tv_show';
    content_id?: number;
    rating?: number;
}

@Injectable()
export class WatchlistService {
    private readonly logger = new Logger(WatchlistService.name);

    /**
     * Add movie or TV show to user's watchlist
     */
    async addToWatchlist(dto: AddToWatchlistDto):
        Promise<UserWatchlist> {
        try {
            // Support both old (movie_id) and new (content_type + content_id) formats
            const contentType = dto.content_type || 'movie';
            const contentId = dto.content_id || dto.movie_id;
            const movieId = contentType === 'movie' ? contentId : dto.movie_id;
            const { user_id, status = 'planned' } = dto;

            if (!contentId) {
                throw new Error('Either movie_id or content_id must be provided');
            }

            this.logger.log(`Adding ${contentType} ${contentId} to watchlist for user ${user_id}`);

            // Check if already exists
            const { data: existing } = await supabase
                .from('user_watchlist')
                .select('*')
                .eq('user_id', user_id)
                .eq('movie_id', movieId || contentId)
                .single();

            if (existing) {
                // Update existing entry
                const updateData: Database['public']['Tables']['user_watchlist']['Update'] = {
                    status,
                    updated_at: new Date().toISOString()
                };
                const { data, error } = await (supabase as any)
                    .from('user_watchlist')
                    .update(updateData)
                    .eq('user_id', user_id)
                    .eq('movie_id', movieId || contentId)
                    .select()
                    .single();

                if (error) throw error;
                return data as UserWatchlist;
            }

            // Insert new entry
            const insertData: Database['public']['Tables']['user_watchlist']['Insert'] = {
                user_id,
                movie_id: movieId || contentId,
                status,
            };
            const { data, error } = await (supabase as any)
                .from('user_watchlist')
                .insert(insertData)
                .select()
                .single();

            if (error) throw error;
            return data as UserWatchlist;
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Add to watchlist error:
  ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Mark movie or TV show as watched with optional rating
     */
    async markAsWatched(dto: MarkAsWatchedDto):
        Promise<UserWatchlist> {
        try {
            // Support both old (movie_id) and new (content_type + content_id) formats
            const contentType = dto.content_type || 'movie';
            const contentId = dto.content_id || dto.movie_id;
            const movieId = contentType === 'movie' ? contentId : dto.movie_id;
            const { user_id, rating } = dto;

            if (!contentId) {
                throw new Error('Either movie_id or content_id must be provided');
            }

            this.logger.log(`Marking ${contentType} ${contentId} as watched for user ${user_id}`);

            // Validate rating if provided
            if (rating !== undefined && (rating < 1 || rating > 10))
            {
                throw new Error('Rating must be between 1 and 10');
            }

            const upsertData: Database['public']['Tables']['user_watchlist']['Insert'] = {
                user_id,
                movie_id: movieId || contentId,
                status: 'watched',
                rating: rating || null,
                watched_at: new Date().toISOString(),
            };
            const { data, error } = await (supabase as any)
                .from('user_watchlist')
                .upsert(upsertData)
                .select()
                .single();

            if (error) throw error;

            // Trigger user profile embedding update (SQL function with trigger)
            // The database trigger will automatically update the user profile
            this.logger.log(`User profile will be updated automatically via trigger`);

            return data as UserWatchlist;
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Mark as watched error:
  ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get user's watchlist with optional filters and language
     */
    async getUserWatchlist(
        userId: string,
        status?: 'planned' | 'watched',
        language = 'en',
    ): Promise<WatchlistItem[]> {
        try {
            this.logger.log(`Getting watchlist for user ${userId}, status: ${status || 'all'}, language: ${language}`);

            let query = supabase
                .from('user_watchlist')
                .select(`
                      movie_id,
                      status,
                      rating,
                      watched_at,
                      created_at,
                      updated_at,
                      movies:movie_id (
                          id,
                          title,
                          description,
                          poster_url,
                          backdrop_url,
                          vote_average,
                          release_date,
                          translations
                      )
                  `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform the data and apply translations
            const items = (data || []).map((item: any) => {
                const movie = item.movies;
                if (!movie) {
                    return {
                        movie_id: item.movie_id,
                        status: item.status,
                        rating: item.rating,
                        watched_at: item.watched_at,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        movie: null,
                    };
                }

                // Apply translations if available
                const translation = movie.translations?.[language];
                const localizedMovie = {
                    id: movie.id,
                    title: translation?.title || movie.title,
                    description: translation?.description || movie.description,
                    poster_url: translation?.poster_url || movie.poster_url,
                    backdrop_url: translation?.backdrop_url || movie.backdrop_url,
                    vote_average: movie.vote_average,
                    release_date: movie.release_date,
                };

                return {
                    movie_id: item.movie_id,
                    status: item.status,
                    rating: item.rating,
                    watched_at: item.watched_at,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    movie: localizedMovie,
                };
            });

            this.logger.log(`Found ${items.length} items in watchlist`);
            return items as WatchlistItem[];
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Get watchlist error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Remove movie from watchlist
     */
    async removeFromWatchlist(userId: string, movieId: number):
        Promise<boolean> {
        try {
            this.logger.log(`Removing movie ${movieId} from 
  watchlist for user ${userId}`);

            const { error } = await supabase
                .from('user_watchlist')
                .delete()
                .eq('user_id', userId)
                .eq('movie_id', movieId);

            if (error) throw error;

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Remove from watchlist error: 
  ${errorMessage}`);
            throw error;
        }
    }
}
