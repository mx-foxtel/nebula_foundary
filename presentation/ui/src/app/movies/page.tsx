
import { MoviesClientWrapper } from './movies-client';

export default function MoviesPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">All Videos</h1>
        <p className="text-muted-foreground mt-2">
          Browse uploaded videos and view their generated metadata.
        </p>
      </div>

      <MoviesClientWrapper />
    </div>
  );
}
