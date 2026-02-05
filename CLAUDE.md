
# Nebula Foundry

## What is this?

Nebula Foundry is an event-driven media metadata generation pipeline on Google Cloud Platform. It automatically generates rich metadata (summaries, transcriptions, video previews) for media files uploaded to Cloud Storage or sourced from YouTube.

## Architecture

The system follows a serverless, event-driven design using Cloud Run services and Pub/Sub messaging:

1. **File Upload** — Media uploaded to a GCS bucket or YouTube URL provided
2. **Dispatch** — `batch_processor_dispatcher` creates a Firestore record and fans out tasks via Pub/Sub
3. **Processing** — Independent services run in parallel:
   - `summaries_generator` — Gemini-powered summaries, chapters, and categorization
   - `transcription_generator` — Audio extraction + Cloud Speech-to-Text
   - `previews_generator` — AI-identified video highlights/shorts
4. **Storage** — Results written to Firestore with status tracking
5. **UI** — Next.js frontend for browsing and searching metadata

## Project Structure

```
services/                        # Python backend services (Flask + Gunicorn)
  batch_processor_dispatcher/    # Entry point — dispatches processing tasks
  summaries_generator/           # Gemini-based summary generation
  transcription_generator/       # Speech-to-text transcription
  previews_generator/            # Video preview/clip extraction
  common/                        # Shared code (MediaAssetManager for Firestore)

presentation/                    # Two Cloud Run services (see Presentation Layer below)
  ui/                            # Next.js 15 frontend (TypeScript, Radix UI, Tailwind)
  ui-backend/                    # Express.js API backend (Firebase Auth, Socket.io, Genkit)
  deploy.sh                      # Deployment script for both services

terraform/                       # Infrastructure as Code (GCP resources)
utilities/
  video-processor/               # Video clipping and branding utility
  gcs-signed-urls-for-firestore/ # Signed URL refresh service
agents/scene_cut/                # Scene detection agent
transcoding/                     # Media encoding scripts
```

## Tech Stack

- **Backend services:** Python, Flask, Gunicorn
- **Frontend:** Next.js 15, TypeScript, Radix UI, TailwindCSS
- **UI Backend:** Express.js, Socket.io, Firebase Admin SDK, Google Genkit
- **AI/ML:** Vertex AI Gemini models, Cloud Speech-to-Text, Vertex AI Discovery Engine
- **Infrastructure:** Terraform, Cloud Run, Pub/Sub, Firestore, GCS, Artifact Registry
- **Video processing:** FFmpeg, moviepy

## Key Pub/Sub Topics

- `central-ingestion-topic` — Entry point for all file events
- `summaries-generation-topic` — Routes to summary service
- `transcription-generation-topic` — Routes to transcription service
- `previews-generation-topic` — Routes to preview service
- `dead-letter-topic` — Failed message handling

## Important Environment Variables

- `GOOGLE_CLOUD_PROJECT` — GCP project ID
- `GCP_REGION` — Resource region (default: `us-central1`)
- `LLM_MODEL` — Gemini model (default: `gemini-2.5-flash`)
- `PUBSUB_TOPIC_*` — Topic names for each service

## Presentation Layer

The UI is split into two Cloud Run services that communicate via HTTP:

```
Browser → UI (Next.js :3000) → UI-Backend (Express :8080) → Firestore / GCS / Vertex AI
```

### `nebula-foundry-ui` (Frontend)
- Next.js 15 server-rendered app
- Port 3000
- Calls backend via `API_URL` env var

### `nebula-foundry-ui-backend` (API)
- Express.js + Socket.io
- Port 8080
- Endpoints:
  - `GET /api/movies` — Fetch media assets from Firestore, generate signed URLs
  - `GET /api/search?q=` — Search via Vertex AI Search (VAIS)
  - `POST /api/upload/signed-url` — Generate signed URL for direct GCS upload
  - `POST /api/upload/publish` — Publish to Pub/Sub to trigger pipeline
  - `GET /api/upload/status/:assetId` — Poll processing status from Firestore
  - WebSocket `chat message` — Real-time AI chat about content

### Deploying the Presentation Layer

```bash
cd presentation
./deploy.sh ui        # Frontend only
./deploy.sh backend   # Backend only
./deploy.sh all       # Both
```

Uses Cloud Build to build Docker images and push to Artifact Registry.

## Development

- Python 3.9+ for backend services
- Node.js 22 for frontend
- Each service has its own `Dockerfile` and `requirements.txt`
- Deploy via `gcloud builds submit` + Terraform
- Use `publish_events.sh` to manually trigger the pipeline for testing

### Local Development Setup

**Backend (ui-backend):**
```bash
cd presentation/ui-backend
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node server.js
# Runs on port 3001
```

**Frontend (ui):**
```bash
cd presentation/ui
npm run dev
# Runs on port 9002
```

**Environment Variables:**
- Frontend: Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Backend: Set `GOOGLE_APPLICATION_CREDENTIALS` to service account key path

## Upload Feature

The UI supports direct video uploads that trigger the metadata generation pipeline.

### Flow
1. User drops/selects video file at `/upload`
2. Frontend requests signed URL from backend
3. File uploads directly to GCS bucket (`poc-metadata-gen2-input`)
4. Backend publishes to `central-ingestion-topic` Pub/Sub
5. Pipeline processes video (summary, transcription, previews)
6. Frontend polls status until complete

### GCS Bucket CORS (Required)
Browser uploads require CORS on the upload bucket:
```bash
gsutil cors set presentation/cors.json gs://poc-metadata-gen2-input
```

CORS config (`presentation/cors.json`):
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

### Service Account Permissions
- `storage.objects.create` on upload bucket
- `pubsub.topics.publish` on `central-ingestion-topic`
- `datastore.viewer` for Firestore status reads
