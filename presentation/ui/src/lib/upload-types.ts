export type UploadState =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'publishing'
  | 'processing'
  | 'completed'
  | 'error';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';

export interface ProcessingStage {
  name: string;
  status: ProcessingStatus;
  label: string;
}

export interface SignedUrlResponse {
  signedUrl: string;
  assetId: string;
  filePath: string;
}

export interface PublishResponse {
  success: boolean;
  messageId: string;
}

export interface AssetStatusResponse {
  assetId: string;
  fileName: string;
  summary?: {
    status: ProcessingStatus;
    data?: unknown;
  };
  transcription?: {
    status: ProcessingStatus;
    data?: unknown;
  };
  previews?: {
    status: ProcessingStatus;
    data?: unknown;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
];

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export function isValidVideoFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload MP4, MOV, AVI, or WebM files.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 500MB.' };
  }
  return { valid: true };
}
