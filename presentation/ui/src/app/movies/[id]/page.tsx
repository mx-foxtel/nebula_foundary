import { MovieDetailWrapper } from './movie-wrapper';

export default async function MovieDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  return <MovieDetailWrapper movieId={id} />;
}
