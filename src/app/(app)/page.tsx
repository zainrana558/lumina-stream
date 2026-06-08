import '@/styles/global.css';
import Home from '@/components/pages/Home';
import type { MediaItem } from '@/types';

const mockFeatured: MediaItem[] = [
  { id: 693, title: 'Breaking Bad', sub: 'Chemistry is power', genre: ['Drama', 'Thriller'], r: 9.5, yr: 2008, eps: 62, st: 'Ended', tag: 'Series', cs: 3, featured: true, progress: 0, desc: 'A high school chemistry teacher turned methamphetamine manufacturer partners with a former student.', cast: [], epList: [], poster_path: '/ztkUQFLlC19CCMYHW73WxxWgMD5.jpg', backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', media_type: 'tv' },
  { id: 66732, title: 'Stranger Things', sub: 'The upside down awaits', genre: ['Sci-Fi', 'Horror', 'Drama'], r: 8.7, yr: 2016, eps: 34, st: 'Returning Series', tag: 'Series', cs: 0, featured: true, progress: 0, desc: 'When a young boy disappears, his mother and friends must confront terrifying supernatural forces.', cast: [], epList: [], poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', backdrop_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', media_type: 'tv' },
  { id: 155, title: 'The Dark Knight', sub: 'Why so serious?', genre: ['Action', 'Drama', 'Crime'], r: 9.0, yr: 2008, eps: 1, st: 'Released', tag: 'Movie', cs: 4, featured: true, progress: 0, desc: 'Batman faces the Joker, a criminal mastermind who wants to plunge Gotham City into anarchy.', cast: [], epList: [], poster_path: '/qJ2tW6WMUDux911BTUgMe1nNaD3.jpg', backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg', media_type: 'movie' },
  { id: 27205, title: 'Inception', sub: 'Your mind is the scene of the crime', genre: ['Sci-Fi', 'Action', 'Thriller'], r: 8.8, yr: 2010, eps: 1, st: 'Released', tag: 'Movie', cs: 7, featured: true, progress: 0, desc: 'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a CEO.', cast: [], epList: [], poster_path: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg', backdrop_path: '/oSLd47YDGxRiMPeGncRQhUBEemX.jpg', media_type: 'movie' },
  { id: 423, title: 'Demon Slayer', sub: 'The journey begins', genre: ['Animation', 'Action', 'Fantasy'], r: 8.9, yr: 2019, eps: 44, st: 'Returning Series', tag: 'Anime', cs: 1, featured: true, progress: 0, desc: 'A young boy becomes a demon slayer after his family is slaughtered and his sister is turned into a demon.', cast: [], epList: [], poster_path: '/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg', backdrop_path: '/wTS2xUoM3Q4cVHzfBPPSZOf4T2k.jpg', media_type: 'tv' },
  { id: 1396, title: 'Breaking Bad', sub: 'Chemistry is power', genre: ['Drama', 'Thriller'], r: 9.5, yr: 2008, eps: 62, st: 'Ended', tag: 'Series', cs: 5, featured: true, progress: 0, desc: 'A high school chemistry teacher turned methamphetamine manufacturer partners with a former student.', cast: [], epList: [], poster_path: '/ztkUQFLlC19CCMYHW73WxxWgMD5.jpg', backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', media_type: 'tv' },
  { id: 100, title: 'The Matrix', sub: 'Welcome to the real world', genre: ['Sci-Fi', 'Action'], r: 8.7, yr: 1999, eps: 1, st: 'Released', tag: 'Movie', cs: 2, featured: true, progress: 0, desc: 'A computer hacker discovers that reality as he knows it is a simulation created by machines.', cast: [], epList: [], poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', backdrop_path: '/ncEsesj庵lqHKfUBJWfmZksnJ.jpg', media_type: 'movie' },
  { id: 62104, title: 'Your Name', sub: 'A connection across time', genre: ['Animation', 'Romance', 'Drama'], r: 8.8, yr: 2016, eps: 1, st: 'Released', tag: 'Anime', cs: 6, featured: true, progress: 0, desc: 'Two teenagers share a profound connection as they discover they are swapping bodies.', cast: [], epList: [], poster_path: '/qG2mIds4rmQEA7Bgf0MFIuaNcB.jpg', backdrop_path: '/i3E5XJLTFEECkNIMtQ7s7AJGKvB.jpg', media_type: 'movie' },
];

interface RowData {
  title: string;
  sub: string;
  items: MediaItem[];
  endpoint: string;
  params?: Record<string, string>;
}

export interface GenreFeatured {
  key: string;
  name: string;
  backdrop: string | null;
  title: string;
  count: number;
  tagline: string;
}

const rows: RowData[] = [
  { title: 'Trending Now', sub: 'Most watched this week', items: mockFeatured.slice(0, 5), endpoint: '/trending/all/week' },
  { title: 'Popular TV', sub: 'Most popular TV shows', items: mockFeatured.slice(2, 7), endpoint: '/tv/popular' },
  { title: 'Top Rated', sub: 'Highest rated of all time', items: mockFeatured.slice(1, 6), endpoint: '/movie/top_rated' },
  { title: 'Coming Soon', sub: 'Upcoming releases', items: mockFeatured.slice(3, 8), endpoint: '/movie/upcoming' },
  { title: 'Action', sub: 'Adrenaline-pumping hits', items: mockFeatured.slice(0, 4), endpoint: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' } },
  { title: 'Comedy', sub: 'Laugh-out-loud favorites', items: mockFeatured.slice(1, 5), endpoint: '/discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' } },
  { title: 'Sci-Fi', sub: 'Explore the unknown', items: mockFeatured.slice(2, 6), endpoint: '/discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' } },
  { title: 'Animation', sub: 'Animated adventures', items: mockFeatured.slice(3, 7), endpoint: '/discover/movie', params: { with_genres: '16', sort_by: 'popularity.desc' } },
];

const genreFeatured: GenreFeatured[] = [];

export const revalidate = 300;

export default async function HomePage() {
  return <Home featured={mockFeatured} rows={rows} genreFeatured={genreFeatured} />;
}
