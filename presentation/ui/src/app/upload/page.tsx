import { UploadClient } from './upload-client';

export const dynamic = 'force-dynamic';

export default function UploadPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Upload Video</h1>
        <p className="text-muted-foreground mt-2">
          Upload a video to generate metadata, transcriptions, and previews.
        </p>
      </div>
      <UploadClient />
    </div>
  );
}
