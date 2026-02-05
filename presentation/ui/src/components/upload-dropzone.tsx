'use client';

import { useCallback, useState } from 'react';
import { Upload, FileVideo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidVideoFile, ACCEPTED_VIDEO_TYPES, MAX_FILE_SIZE } from '@/lib/upload-types';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onFileSelect, disabled }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validation = isValidVideoFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_VIDEO_TYPES.join(',');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFile(file);
      }
    };
    input.click();
  }, [disabled, handleFile]);

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-destructive'
        )}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isDragOver ? (
            <FileVideo className="w-12 h-12 mb-4 text-primary" />
          ) : (
            <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
          )}
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Drag & drop</span> or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            MP4, MOV, AVI, WebM • Max {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB
          </p>
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
