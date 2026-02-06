'use client';

import { useMemo } from 'react';
import { MovieClientPage } from './client-page';
import { useMovies } from '@/lib/use-movies';
import type { Movie } from '@/lib/types';
import { Loader2, Settings, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface MovieDetailWrapperProps {
  movieId: string;
}

export function MovieDetailWrapper({ movieId }: MovieDetailWrapperProps) {
  const { movies, loading, unauthorized, error } = useMovies();

  const movie: Movie | null = useMemo(() => {
    const found = movies.find((m) => m.id === movieId);
    if (!found) return null;
    // Sanitize to ensure plain object
    return JSON.parse(JSON.stringify(found));
  }, [movies, movieId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading movie...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Settings className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">API Key Required</h2>
        <p className="text-muted-foreground max-w-md">
          Please click the settings icon (gear) in the header to enter your API key.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Movie</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Movie Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The movie you're looking for doesn't exist.
        </p>
        <Link href="/movies">
          <Button className="mt-4">Back to Movies</Button>
        </Link>
      </div>
    );
  }

  return <MovieClientPage movie={movie} />;
}
