import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import type { UserWatchlist } from '@repo/db';

export interface WatchlistItem extends Omit<UserWatchlist,
    'user_id'> {
    movie?: {
        id: number;
        title: string;
        poster_url: string | null;
        vote_average: number | null;
        release_date: string | null;
    };
}

export interface AddToWatchlistDto {
    user_id: string;
    movie_id: number;
    status?: 'planned' | 'watched';
}

export interface MarkAsWatchedDto {
    user_id: string;
    movie_id: number;
    rating?: number;
}

@Injectable()
export class WatchlistService {
    private readonly logger = new Logger(WatchlistService.name);

    /**
     * Add movie to user's watchlist
     */
    async addToWatchlist(dto: AddToWatchlistDto):
        Promise<UserWatchlist> {
        try {
            const { user_id, movie_id, status = 'planned' } = dto;
            this.logger.log(`Adding movie ${movie_id} to watchlist 
  for user ${user_id}`);

            // Check if already exists
            const { data: existing } = await supabase
                .from('user_watchlist')
                .select('*')
                .eq('user_id', user_id)
                .eq('movie_id', movie_id)
                .single();

            if (existing) {
                // Update existing entry
                const { data, error } = await supabase
                    .from('user_watchlist')
                    .update({ status, updated_at: new Date().toISOString() })
                    .eq('user_id', user_id)
                    .eq('movie_id', movie_id)
                    .select()
                    .single();

                if (error) throw error;
                return data as UserWatchlist;
            }

            // Insert new entry
            const { data, error } = await supabase
                .from('user_watchlist')
                .insert({
                    user_id,
                    movie_id,
                    status,
                })
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
     * Mark movie as watched with optional rating
     */
    async markAsWatched(dto: MarkAsWatchedDto):
        Promise<UserWatchlist> {
        try {
            const { user_id, movie_id, rating } = dto;
            this.logger.log(`Marking movie ${movie_id} as watched 
  for user ${user_id}`);

            // Validate rating if provided
            if (rating !== undefined && (rating < 1 || rating > 10))
            {
                throw new Error('Rating must be between 1 and 10');
            }

            const { data, error } = await supabase
                .from('user_watchlist')
                .upsert({
                    user_id,
                    movie_id,
                    status: 'watched',
                    rating: rating || null,
                    watched_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            // Trigger user profile embedding update (SQL function with trigger)
                // The database trigger will automatically update the    user profile
            this.logger.log(`User profile will be updated 
  automatically via trigger`);

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
     * Get user's watchlist with optional filters
     */
    async getUserWatchlist(
        userId: string,
        status?: 'planned' | 'watched',
    ): Promise<WatchlistItem[]> {
        try {
            this.logger.log(`Getting watchlist for user ${userId}, 
  status: ${status || 'all'}`);

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
                          poster_url,
                          vote_average,
                          release_date
                      )
                  `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform the data to match WatchlistItem interface
            const items = (data || []).map((item: any) => ({
                movie_id: item.movie_id,
                status: item.status,
                rating: item.rating,
                watched_at: item.watched_at,
                created_at: item.created_at,
                updated_at: item.updated_at,
                movie: item.movies,
            }));

            this.logger.log(`Found ${items.length} items in 
  watchlist`);
            return items as WatchlistItem[];
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Get watchlist error: 
  ${errorMessage}`);
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
