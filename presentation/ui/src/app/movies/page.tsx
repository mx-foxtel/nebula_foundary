
import { getContent } from '@/lib/data';
import { MoviesClient } from './movies-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'

export default async function MoviesPage() {
  logger.log('Rendering MoviesPage...');
  const content = await getContent();
  const movies = content.movies;
  logger.log(`MoviesPage received ${movies.length} videos.`);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">All Videos</h1>
        <p className="text-muted-foreground mt-2">
          Browse uploaded videos and view their generated metadata.
        </p>
      </div>

      <MoviesClient movies={movies} />
    </div>
  );
}
