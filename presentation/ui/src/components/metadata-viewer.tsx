'use client';

import { useState } from 'react';
import { Code, LayoutGrid, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MetadataViewerProps {
  data: Record<string, unknown>;
  title?: string;
}

// Collapsible JSON section for raw view
function JsonSection({ label, data, defaultOpen = false }: { label: string; data: unknown; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <span className="font-medium">{label}</span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && (
        <div className="p-3 bg-zinc-950">
          <pre className="text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}

// Raw JSON View with copy functionality
function RawJsonView({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const fullJson = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Categorize the data keys
  const categories = {
    'Basic Info': ['id', 'file_name', 'source', 'file_category', 'content_type', 'file_path'],
    'URLs': ['public_url', 'poster_url'],
    'Timestamps': ['upload_time', 'created_at', 'updated_at'],
    'Summary': ['summary'],
    'Transcription': ['transcription'],
    'Previews': ['previews'],
    'Video Details': ['video_details'],
    'Other': [] as string[],
  };

  // Find keys that don't fit in predefined categories
  const allPredefinedKeys = Object.values(categories).flat();
  const otherKeys = Object.keys(data).filter(key => !allPredefinedKeys.includes(key));
  categories['Other'] = otherKeys;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? 'Copied!' : 'Copy All'}
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {Object.entries(categories).map(([category, keys]) => {
            const categoryData = keys.reduce((acc, key) => {
              if (key in data) {
                acc[key] = data[key];
              }
              return acc;
            }, {} as Record<string, unknown>);

            if (Object.keys(categoryData).length === 0) return null;

            return (
              <JsonSection
                key={category}
                label={category}
                data={categoryData}
                defaultOpen={category === 'Basic Info'}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper to render values nicely
function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">N/A</span>;
  }
  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>;
  }
  if (typeof value === 'number') {
    return <span className="font-mono">{value}</span>;
  }
  if (typeof value === 'string') {
    if (value.startsWith('http') || value.startsWith('gs://')) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-md">
          {value.length > 60 ? value.slice(0, 60) + '...' : value}
        </a>
      );
    }
    return <span>{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">Empty</span>;
    if (typeof value[0] === 'string') {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <Badge key={i} variant="secondary">{String(item)}</Badge>
          ))}
        </div>
      );
    }
    return <span className="text-muted-foreground">{value.length} items</span>;
  }
  if (typeof value === 'object') {
    // Handle Firestore timestamp
    if ('_seconds' in (value as object)) {
      const ts = value as { _seconds: number };
      return <span>{new Date(ts._seconds * 1000).toLocaleString()}</span>;
    }
    return <span className="text-muted-foreground">Object</span>;
  }
  return <span>{String(value)}</span>;
}

// Categorized attribute view
function CategorizedView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as Record<string, unknown> | undefined;
  const transcription = data.transcription as Record<string, unknown> | undefined;
  const previews = data.previews as Record<string, unknown> | undefined;

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Asset ID', key: 'id' },
                { label: 'File Name', key: 'file_name' },
                { label: 'Source', key: 'source' },
                { label: 'Category', key: 'file_category' },
                { label: 'Content Type', key: 'content_type' },
                { label: 'Upload Time', key: 'upload_time' },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <div className="text-sm">{renderValue(data[key])}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {summary && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Boolean(summary.summary) && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{String(summary.summary)}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Boolean(summary.video_mood) && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Video Mood</p>
                    <div>{renderValue(summary.video_mood)}</div>
                  </div>
                )}
                {Boolean(summary.theme) && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Themes</p>
                    <div>{renderValue(summary.theme)}</div>
                  </div>
                )}
                {Boolean(summary.subject) && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Subjects</p>
                    <div>{renderValue(summary.subject)}</div>
                  </div>
                )}
                {Boolean(summary.practice) && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Practices</p>
                    <div>{renderValue(summary.practice)}</div>
                  </div>
                )}
              </div>

              {Array.isArray(summary.sections) && summary.sections.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Chapters</p>
                  <p className="text-sm">{summary.sections.length} sections identified</p>
                </div>
              )}

              {Array.isArray(summary.character) && summary.character.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Characters</p>
                  <p className="text-sm">{summary.character.length} characters identified</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transcription */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(transcription?.words) && transcription.words.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Available</Badge>
                  <span className="text-sm text-muted-foreground">
                    {transcription.words.length} words transcribed
                  </span>
                </div>
                {Boolean(transcription.status) && (
                  <p className="text-sm">Status: {String(transcription.status)}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Not Available</Badge>
                {Boolean(transcription?.status) && (
                  <span className="text-sm text-muted-foreground">
                    Status: {String(transcription?.status)}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Previews */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Previews / Clips</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(previews?.clips) && previews.clips.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Available</Badge>
                  <span className="text-sm text-muted-foreground">
                    {previews.clips.length} clips generated
                  </span>
                </div>
                <div className="space-y-2">
                  {(previews.clips as Array<{ start_timecode?: string; end_timecode?: string; summary?: string }>).slice(0, 3).map((clip, i) => (
                    <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        {clip.start_timecode} - {clip.end_timecode}
                      </span>
                      <p className="mt-1 line-clamp-2">{clip.summary}</p>
                    </div>
                  ))}
                  {previews.clips.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{previews.clips.length - 3} more clips
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Not Available</Badge>
                {Boolean(previews?.status) && (
                  <span className="text-sm text-muted-foreground">
                    Status: {String(previews?.status)}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processing Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground mb-1">Summary</p>
                <Badge variant={summary ? 'default' : 'secondary'}>
                  {summary ? 'Complete' : 'Pending'}
                </Badge>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground mb-1">Transcription</p>
                <Badge variant={transcription?.words ? 'default' : 'secondary'}>
                  {transcription?.words ? 'Complete' : 'Pending'}
                </Badge>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground mb-1">Previews</p>
                <Badge variant={(previews?.clips as unknown[] | undefined)?.length ? 'default' : 'secondary'}>
                  {(previews?.clips as unknown[] | undefined)?.length ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export function MetadataViewer({ data, title = 'Metadata' }: MetadataViewerProps) {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight mb-6">{title}</h2>
      <Tabs defaultValue="categorized" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="categorized" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Categorized
          </TabsTrigger>
          <TabsTrigger value="raw" className="gap-2">
            <Code className="h-4 w-4" />
            Raw JSON
          </TabsTrigger>
        </TabsList>
        <TabsContent value="categorized">
          <CategorizedView data={data} />
        </TabsContent>
        <TabsContent value="raw">
          <RawJsonView data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
