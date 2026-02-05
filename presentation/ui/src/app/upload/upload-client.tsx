'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { UploadDropzone } from '@/components/upload-dropzone';
import { ProcessingStatus } from '@/components/processing-status';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSignedUploadUrl, publishUpload, getAssetStatus } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { FileVideo, ExternalLink, RotateCcw } from 'lucide-react';
import type {
  UploadState,
  ProcessingStage,
  SignedUrlResponse,
  AssetStatusResponse,
  UploadProgress,
} from '@/lib/upload-types';

const POLL_INTERVAL = 5000;

export function UploadClient() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [assetId, setAssetId] = useState<string | null>(null);
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
    { name: 'summary', status: 'pending', label: 'Summary' },
    { name: 'transcription', status: 'pending', label: 'Transcription' },
    { name: 'previews', status: 'pending', label: 'Previews' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const resetState = useCallback(() => {
    setUploadState('idle');
    setSelectedFile(null);
    setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
    setAssetId(null);
    setProcessingStages([
      { name: 'summary', status: 'pending', label: 'Summary' },
      { name: 'transcription', status: 'pending', label: 'Transcription' },
      { name: 'previews', status: 'pending', label: 'Previews' },
    ]);
    setError(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (id: string) => {
    try {
      const status: AssetStatusResponse = await getAssetStatus(id);

      const stages: ProcessingStage[] = [
        {
          name: 'summary',
          status: status.summary?.status || 'pending',
          label: 'Summary',
        },
        {
          name: 'transcription',
          status: status.transcription?.status || 'pending',
          label: 'Transcription',
        },
        {
          name: 'previews',
          status: status.previews?.status || 'pending',
          label: 'Previews',
        },
      ];

      setProcessingStages(stages);

      const allDone = stages.every(
        (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'not_applicable'
      );

      if (allDone) {
        setUploadState('completed');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        toast({
          title: 'Processing Complete',
          description: 'Your video has been processed successfully.',
        });
      }
    } catch (err) {
      console.error('Failed to poll status:', err);
    }
  }, [toast]);

  const startPolling = useCallback((id: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollStatus(id);
    pollIntervalRef.current = setInterval(() => pollStatus(id), POLL_INTERVAL);
  }, [pollStatus]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setUploadState('preparing');

    try {
      const urlResponse: SignedUrlResponse = await getSignedUploadUrl(file.name, file.type);
      const { signedUrl, assetId: newAssetId, filePath } = urlResponse;

      setAssetId(newAssetId);
      setUploadState('uploading');

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadState('publishing');
          try {
            await publishUpload(newAssetId, file.name, filePath, file.type);
            setUploadState('processing');
            startPolling(newAssetId);
          } catch (pubErr) {
            setError('Failed to start processing pipeline');
            setUploadState('error');
          }
        } else {
          setError('Failed to upload file to storage');
          setUploadState('error');
        }
      });

      xhr.addEventListener('error', () => {
        setError('Upload failed. Please try again.');
        setUploadState('error');
      });

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    } catch (err) {
      setError('Failed to prepare upload');
      setUploadState('error');
    }
  }, [startPolling]);

  const isUploading = uploadState === 'preparing' || uploadState === 'uploading' || uploadState === 'publishing';
  const isProcessing = uploadState === 'processing';
  const showProgress = isUploading || isProcessing || uploadState === 'completed';

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-6 w-6" />
          Upload Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {uploadState === 'idle' && (
          <UploadDropzone onFileSelect={handleFileSelect} />
        )}

        {uploadState === 'error' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button onClick={resetState} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {showProgress && selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <FileVideo className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {uploadState === 'preparing' && 'Preparing upload...'}
                    {uploadState === 'uploading' && 'Uploading...'}
                    {uploadState === 'publishing' && 'Starting pipeline...'}
                  </span>
                  <span className="font-medium">{uploadProgress.percentage}%</span>
                </div>
                <Progress value={uploadProgress.percentage} />
              </div>
            )}

            {(isProcessing || uploadState === 'completed') && (
              <ProcessingStatus stages={processingStages} />
            )}

            {uploadState === 'completed' && assetId && (
              <div className="pt-4 space-y-3">
                <Link href={`/movies/${assetId}`}>
                  <Button className="w-full">
                    View Processed Video
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Button onClick={resetState} variant="outline" className="w-full">
                  Upload Another Video
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
