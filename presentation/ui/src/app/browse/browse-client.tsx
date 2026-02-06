'use client';

import { useMemo } from 'react';
import { Swimlane } from '@/components/swimlane';
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

// Helper function to get a single random short for each movie that has shorts
const getShortsForSwimlane = (movies: Movie[], count: number): ShortWithMovieInfo[] => {
  const moviesWithShorts = movies.filter((movie) => movie.previews?.clips && movie.previews.clips.length > 0);
  const shuffledMovies = [...moviesWithShorts].sort(() => 0.5 - Math.random());

  return shuffledMovies.slice(0, count).map((movie) => {
    const randomClip = movie.previews.clips[Math.floor(Math.random() * movie.previews.clips.length)];
    const short = clipToShort(randomClip, 0, movie);

    return {
      ...short,
      movie: {
        id: movie.id,
        file_name: movie.file_name,
        poster_url: movie.poster_url,
      },
    };
  });
};

export function BrowseClient() {
  const { movies, loading, unauthorized, error } = useMovies();

  const swimlaneData = useMemo(() => {
    if (movies.length === 0) return null;

    return {
      continueWatching: getShortsForSwimlane(movies, 2),
      recommended: getShortsForSwimlane(movies, 10),
      popular: getShortsForSwimlane(movies, 10),
      top10: getShortsForSwimlane(movies, 10),
    };
  }, [movies]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading content...</p>
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
          This is required to access the content.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Content</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <section className="relative w-full h-[30vh] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10" />
        <div className="relative z-20 flex flex-col items-center gap-4 px-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-white">
            Nebula Foundry
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-muted-foreground">
            Bite-sized stories from your favorite films. Reimagined.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {swimlaneData && (
          <>
            <Swimlane title="Continue Watching" shorts={swimlaneData.continueWatching} />
            <Swimlane title="Recommended For You" shorts={swimlaneData.recommended} />
            <Swimlane title="Most Popular" shorts={swimlaneData.popular} />
            <Swimlane title="Top 10" shorts={swimlaneData.top10} />
          </>
        )}
      </div>
    </div>
  );
}
