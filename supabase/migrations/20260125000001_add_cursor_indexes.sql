-- Indexes for cursor-based pagination
create index if not exists idx_movies_popularity_id
on movies(popularity desc, id desc)
where embedding is not null and popularity is not null;

create index if not exists idx_tv_shows_popularity_id
on tv_shows(popularity desc, id desc)
where popularity is not null;
