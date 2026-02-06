'use client';

import { useState, useMemo, useEffect } from 'react';
import { MovieCard } from '@/components/movie-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Clock,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import type { Movie } from '@/lib/types';
import { getMovies } from '@/lib/api';
import { hasApiKey } from '@/lib/auth';

interface MoviesClientProps {
  movies: Movie[];
}

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type FilterStatus = 'all' | 'complete' | 'processing' | 'pending';
type ViewMode = 'grid' | 'list';

// Helper to get upload time from movie data
function getUploadTime(movie: Movie): number {
  const movieData = movie as unknown as Record<string, unknown>;
  if (movieData.upload_time && typeof movieData.upload_time === 'object') {
    const ts = movieData.upload_time as { _seconds?: number };
    if (ts._seconds) return ts._seconds * 1000;
  }
  return 0;
}

// Helper to check processing status
function getProcessingStatus(movie: Movie): 'complete' | 'processing' | 'pending' {
  const hasTranscription = movie.transcription?.words && movie.transcription.words.length > 0;
  const hasSummary = movie.summary?.summary;
  const hasPreviews = movie.previews?.clips && movie.previews.clips.length > 0;

  if (hasTranscription && hasSummary && hasPreviews) {
    return 'complete';
  }
  if (hasTranscription || hasSummary || hasPreviews) {
    return 'processing';
  }
  return 'pending';
}

// Status badge component
function StatusBadge({ status }: { status: 'complete' | 'processing' | 'pending' }) {
  switch (status) {
    case 'complete':
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="secondary" className="bg-yellow-600">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

// List view item component
function MovieListItem({ movie }: { movie: Movie }) {
  const status = getProcessingStatus(movie);
  const uploadTime = getUploadTime(movie);
  const movieData = movie as unknown as Record<string, unknown>;

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
            <img
              src={movie.poster_url}
              alt={movie.file_name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-grow min-w-0">
            <a href={`/movies/${movie.id}`} className="hover:underline">
              <h3 className="font-medium truncate">{movie.file_name}</h3>
            </a>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{String(movieData.source || 'GCS')}</span>
              <span>•</span>
              <span>{String(movieData.file_category || 'video')}</span>
              {uploadTime > 0 && (
                <>
                  <span>•</span>
                  <span>{new Date(uploadTime).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={status} />
            <a href={`/movies/${movie.id}`}>
              <Button variant="outline" size="sm">View</Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MoviesClient({ movies }: MoviesClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter and sort movies
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(movie =>
        movie.file_name.toLowerCase().includes(query) ||
        movie.summary?.summary?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(movie => getProcessingStatus(movie) === filterStatus);
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return getUploadTime(b) - getUploadTime(a);
        case 'oldest':
          return getUploadTime(a) - getUploadTime(b);
        case 'name-asc':
          return a.file_name.localeCompare(b.file_name);
        case 'name-desc':
          return b.file_name.localeCompare(a.file_name);
        default:
          return 0;
      }
    });

    return result;
  }, [movies, searchQuery, sortBy, filterStatus]);

  // Get recent uploads (last 7 days)
  const recentUploads = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return movies
      .filter(movie => getUploadTime(movie) > sevenDaysAgo)
      .sort((a, b) => getUploadTime(b) - getUploadTime(a));
  }, [movies]);

  // Stats
  const stats = useMemo(() => {
    const complete = movies.filter(m => getProcessingStatus(m) === 'complete').length;
    const processing = movies.filter(m => getProcessingStatus(m) === 'processing').length;
    const pending = movies.filter(m => getProcessingStatus(m) === 'pending').length;
    return { complete, processing, pending, total: movies.length };
  }, [movies]);

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Videos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.complete}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{stats.processing}</p>
            <p className="text-sm text-muted-foreground">Processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-muted-foreground">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads Section */}
      {recentUploads.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Recent Uploads</h2>
            <Badge variant="secondary">{recentUploads.length}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentUploads.slice(0, 6).map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[150px]">
              {sortBy.includes('asc') || sortBy === 'oldest' ? (
                <SortAsc className="h-4 w-4 mr-2" />
              ) : (
                <SortDesc className="h-4 w-4 mr-2" />
              )}
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Upload Button */}
          <a href="/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </a>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredMovies.length} of {movies.length} videos
      </p>

      {/* Videos Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredMovies.map(movie => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMovies.map(movie => (
            <MovieListItem key={movie.id} movie={movie} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredMovies.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No videos found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

// Wrapper component that fetches data client-side
export function MoviesClientWrapper() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if API key exists before fetching
    if (!hasApiKey()) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    async function fetchMovies() {
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
    }

    fetchMovies();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading videos...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Settings className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">API Key Required</h2>
        <p className="text-muted-foreground max-w-md">
          Please click the settings icon (gear) in the header to enter your API key.
          This is required to access the video library.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Videos</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return <MoviesClient movies={movies} />;
}
