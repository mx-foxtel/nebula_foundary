'use client';

import { useState, useEffect } from 'react';
import { getMovies } from './api';
import { hasApiKey } from './auth';
import type { Movie } from './types';

interface UseMoviesResult {
  movies: Movie[];
  loading: boolean;
  unauthorized: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMovies(): UseMoviesResult {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    // Check if API key exists before fetching
    if (!hasApiKey()) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    try {
      const result = await getMovies();
      if (result?._unauthorized) {
        setUnauthorized(true);
      } else if (Array.isArray(result)) {
        setMovies(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  return { movies, loading, unauthorized, error, refetch: fetchMovies };
}
