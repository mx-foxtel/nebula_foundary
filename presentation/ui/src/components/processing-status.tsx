'use client';

import { Check, Circle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProcessingStage, ProcessingStatus } from '@/lib/upload-types';

interface ProcessingStatusProps {
  stages: ProcessingStage[];
}

function StatusIcon({ status }: { status: ProcessingStatus }) {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'failed':
      return <X className="h-4 w-4 text-destructive" />;
    case 'pending':
    case 'not_applicable':
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusText({ status }: { status: ProcessingStatus }) {
  const text: Record<ProcessingStatus, string> = {
    pending: 'Pending',
    processing: 'Processing...',
    completed: 'Completed',
    failed: 'Failed',
    not_applicable: 'N/A',
  };
  return (
    <span
      className={cn(
        'text-sm',
        status === 'completed' && 'text-green-500',
        status === 'processing' && 'text-primary',
        status === 'failed' && 'text-destructive',
        (status === 'pending' || status === 'not_applicable') && 'text-muted-foreground'
      )}
    >
      {text[status]}
    </span>
  );
}

export function ProcessingStatus({ stages }: ProcessingStatusProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Processing Status</h3>
      <div className="space-y-2">
        {stages.map((stage) => (
          <div
            key={stage.name}
            className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <StatusIcon status={stage.status} />
              <span className="text-sm font-medium">{stage.label}</span>
            </div>
            <StatusText status={stage.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
