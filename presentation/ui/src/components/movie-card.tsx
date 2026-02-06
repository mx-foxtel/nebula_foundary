
import Link from 'next/link';
import Image from 'next/image';
import type { Movie } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  // Use a better placeholder if the poster_url is a placehold.co URL
  const posterUrl = movie.poster_url?.includes('placehold.co')
    ? `https://placehold.co/400x600/1a1a2e/FFFFFF?text=${encodeURIComponent(movie.file_name?.slice(0, 15) || 'Video')}`
    : movie.poster_url;

  return (
    <Link href={`/movies/${movie.id}`} key={movie.id} className="group block">
      <Card className="overflow-hidden transition-all duration-300 ease-in-out hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1 border-transparent hover:border-primary/50">
        <CardContent className="p-0">
          <div className="relative aspect-[2/3]">
            <Image
              src={posterUrl}
              alt={movie.file_name}
              data-ai-hint="movie poster"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="p-3 bg-secondary/20">
            <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary">
              {movie.file_name} {movie.is_dummy === false && '✨'}
            </h3>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
