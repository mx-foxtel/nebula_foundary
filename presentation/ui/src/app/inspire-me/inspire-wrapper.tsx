'use client';

import { useMemo } from 'react';
import { InspireMeClientPage } from './client-page';
import { useMovies } from '@/lib/use-movies';
import type { Short, ShortWithMovieInfo, Movie } from '@/lib/types';
import { Loader2, Settings, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper to convert a Clip to a Short
const clipToShort = (clip: any, index: number, movie: Movie): Short => ({
  id: `${movie.id}-short-${index}`,
  title: clip.summary,
  description: clip.user_description,
  startTime: clip.start_timecode,
  endTime: clip.end_timecode,
  videoUrl: movie.public_url,
  thumbnailUrl: movie.poster_url,
  categories: clip.emotions_triggered,
});

export function InspireMeWrapper() {
  const { movies, loading, unauthorized, error } = useMovies();

  const shorts: ShortWithMovieInfo[] = useMemo(() => {
    return movies.flatMap((movie) =>
      (movie.previews?.clips || []).map((clip, index) => {
        const short = clipToShort(clip, index, movie);
        return {
          ...short,
          movie: {
            id: movie.id,
            file_name: movie.file_name,
            poster_url: movie.poster_url,
          },
        };
      })
    );
  }, [movies]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        Loading What to Watch...
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white text-center px-4">
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
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white text-center px-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Content</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return <InspireMeClientPage shorts={shorts} />;
}
