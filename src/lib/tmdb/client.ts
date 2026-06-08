const BASE_URL = "https://api.themoviedb.org/3";

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const bearerToken = process.env.TMDB_BEARER_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!bearerToken && !apiKey) throw new Error("TMDB credentials not configured");

  const headers: Record<string, string> = {};
  const searchParams = new URLSearchParams();

  if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`;
  } else {
    searchParams.set("api_key", apiKey!);
  }

  Object.entries(params).forEach(([key, value]) => searchParams.set(key, value));

  const res = await fetch(`${BASE_URL}${endpoint}?${searchParams}`, {
    headers,
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
  return res.json();
}

interface TMDBListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  media_type?: string;
  popularity: number;
  genre_ids?: number[];
  release_date?: string;
  first_air_date?: string;
  adult?: boolean;
  original_language?: string;
  original_title?: string;
  original_name?: string;
  video?: boolean;
  vote_count?: number;
}

export interface MediaDetails extends MediaItem {
  genres: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null; order: number }[];
    crew: { id: number; name: string; job: string; department: string; profile_path: string | null }[];
  };
  similar?: { results: MediaItem[] };
  videos?: { results: { id: string; key: string; site: string; type: string; name: string }[] };
  seasons?: { id: number; season_number: number; name: string; episode_count: number; poster_path: string | null; air_date: string }[];
}

export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  runtime?: number;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  season_number: number;
}

export async function getTrending(mediaType: "movie" | "tv" | "all" = "all", timeWindow: "day" | "week" = "week") {
  return tmdbFetch<TMDBListResponse<MediaItem>>(`/trending/${mediaType}/${timeWindow}`);
}

export async function getPopular(mediaType: "movie" | "tv") {
  return tmdbFetch<TMDBListResponse<MediaItem>>(`/${mediaType}/popular`);
}

export async function getTopRated(mediaType: "movie" | "tv") {
  return tmdbFetch<TMDBListResponse<MediaItem>>(`/${mediaType}/top_rated`);
}

export async function getNowPlaying() {
  return tmdbFetch<TMDBListResponse<MediaItem>>("/movie/now_playing");
}

export async function getUpcoming() {
  return tmdbFetch<TMDBListResponse<MediaItem>>("/movie/upcoming");
}

export async function getAiringToday() {
  return tmdbFetch<TMDBListResponse<MediaItem>>("/tv/airing_today");
}

export async function getOnTheAir() {
  return tmdbFetch<TMDBListResponse<MediaItem>>("/tv/on_the_air");
}

export async function getDetails(mediaType: "movie" | "tv", id: number) {
  return tmdbFetch<MediaDetails>(`/${mediaType}/${id}`, {
    append_to_response: "credits,similar,videos",
  });
}

export async function getSeasonEpisodes(tvId: number, seasonNumber: number) {
  const data = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${tvId}/season/${seasonNumber}`);
  return data.episodes;
}

export async function searchMedia(query: string, page: string = "1") {
  return tmdbFetch<TMDBListResponse<MediaItem>>("/search/multi", { query, page });
}

export async function getGenres(mediaType: "movie" | "tv") {
  return tmdbFetch<{ genres: { id: number; name: string }[] }>(`/genre/${mediaType}/list`);
}

export async function getByGenre(mediaType: "movie" | "tv", genreId: number, page: string = "1") {
  return tmdbFetch<TMDBListResponse<MediaItem>>(`/discover/${mediaType}`, {
    with_genres: genreId.toString(),
    sort_by: "popularity.desc",
    page,
  });
}

export async function getRecommendations(mediaType: "movie" | "tv", mediaId: number) {
  return tmdbFetch<TMDBListResponse<MediaItem>>(`/${mediaType}/${mediaId}/recommendations`);
}

export function getImageUrl(path: string | null, size: string = "w500"): string {
  if (!path) return "/placeholder.svg";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getTitle(item: { title?: string; name?: string }): string {
  return item.title || item.name || "Untitled";
}
