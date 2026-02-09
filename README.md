# Nebula Foundry - a media metadata generator
<p align="center">
  <img src="presentation/ui/public/logo.png" alt="Nebula Foundry logo" width="100" className="object-contain rounded-full" >
</p>

This project is a scalable, event-driven pipeline built on Google Cloud to automatically generate rich metadata for media files. When a video, audio, or document file is uploaded to a Google Cloud Storage (GCS) bucket — or a YouTube URL is provided — this system triggers a series of serverless Cloud Run services to generate:

-   **Summaries & Chapters**: Using Vertex AI's Gemini models.
-   **Transcriptions**: Using the Google Cloud Speech-to-Text API.
-   **Video Previews/Shorts**: Using Vertex AI's Gemini models to identify key scenes.

All generated metadata is stored and managed in a central Firestore database, and browsable through a Next.js web UI.

## Architecture

The architecture is fully serverless and designed for scalability and decoupling of services.

1.  **File Upload**: A user uploads a media file via the web UI (direct GCS upload), via `gsutil`, or provides a YouTube URL.
2.  **Initial Event**: A message is published to the central Pub/Sub topic (`central-ingestion-topic`).
3.  **Dispatcher Service (`batch-processor-dispatcher`)**:
    -   A Cloud Run service subscribes to the central topic.
    -   It creates a new asset record in the Firestore `media_assets` collection.
    -   Based on the file type (video, audio, etc.), it dispatches tasks by publishing messages to specific Pub/Sub topics (`summaries-generation-topic`, `transcription-generation-topic`, `previews-generation-topic`).
4.  **Metadata Generator Services** (run in parallel):
    -   **`summaries-generator`**: Passes the GCS URI or YouTube URL to Gemini for summary, chapters, categorization, and mood analysis.
    -   **`transcription-generator`**: Downloads the video, extracts audio with `ffmpeg`, uploads audio to GCS, and calls the Speech-to-Text API (Chirp model).
    -   **`previews-generator`**: Uses Gemini to identify highlight clips, then generates short video previews with `moviepy`.
5.  **Firestore Update**: Each generator service updates the corresponding asset's document in Firestore with the results (`completed` status) or an error (`failed` status).
6.  **Presentation Layer**: A Next.js frontend + Express.js backend serve the UI for browsing, searching, uploading, and chatting about content.

<p align="center">
  <img src="docs/images/architecture.png" alt="Architecture Diagram" width="800">
</p>

---

## Project Structure

```
services/                        # Python backend services (Flask + Gunicorn)
  batch_processor_dispatcher/    # Entry point — dispatches processing tasks
  summaries_generator/           # Gemini-based summary generation
  transcription_generator/       # Speech-to-text transcription
  previews_generator/            # Video preview/clip extraction
  common/                        # Shared code (MediaAssetManager for Firestore)

presentation/                    # Two Cloud Run services
  ui/                            # Next.js 15 frontend (TypeScript, Radix UI, Tailwind)
  ui-backend/                    # Express.js API backend (Socket.io, Genkit)
  deploy.sh                      # Deployment script for both services
  cors.json                      # CORS config for GCS upload bucket

terraform/                       # Infrastructure as Code (GCP resources)
utilities/
  video-processor/               # Video clipping and branding utility
  gcs-signed-urls-for-firestore/ # Signed URL refresh service
agents/scene_cut/                # Scene detection agent
transcoding/                     # Media encoding scripts
```

---

## Prerequisites

1.  **Google Cloud Project**: A Google Cloud project with billing enabled.
2.  **gcloud CLI**: The Google Cloud CLI installed and authenticated.
3.  **Terraform**: Terraform installed (v1.0.0+).
4.  **Python**: Python 3.9+ installed.
5.  **Node.js**: Node.js 22+ (for the presentation layer).

---

## Deployment

### 1. Configure Terraform

First, copy the example variables file and customize it for your environment.

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit `terraform/terraform.tfvars` and set the required variables:

-   `project_id`: Your Google Cloud project ID.
-   `input_bucket_names`: A list of GCS bucket names that will trigger the pipeline.
-   `vais_location`, `vais_collection_id`, `vais_engine_id`: Vertex AI Search configuration (see [Search Setup](#5-enable-vertex-ai-search)).
-   `api_key`: API key for securing backend endpoints (recommended for production).

**Example `terraform.tfvars`:**
```hcl
project_id = "your-gcp-project-id"

input_bucket_names = [
  "your-gcp-project-id-input"
]

# Model overrides (optional)
summaries_generator_llm_model    = "gemini-2.5-pro"
transcription_generator_llm_model = "chirp"
previews_generator_llm_model     = "gemini-2.5-flash"

# Vertex AI Search (configure after creating the search app)
vais_location      = "global"
vais_collection_id = "default_collection"
vais_engine_id     = "your-engine-id"

# API key for backend auth (leave empty to disable — not recommended for production)
api_key = "your-secret-api-key"
```

> **Note:** Docker image variables (`batch_processor_image`, `summaries_generator_image`, etc.) default to a Cloud Run hello-world placeholder. After your first `terraform apply`, build and push your actual images (step 2), then uncomment and set the image variables in your `.tfvars` and re-apply.

#### 1.1 Enable Terraform prerequisite APIs

These must be enabled before `terraform plan` and `terraform apply` will work:

```bash
gcloud services enable serviceusage.googleapis.com --project=your-gcp-project-id
gcloud services enable cloudresourcemanager.googleapis.com --project=your-gcp-project-id
```

### 2. Build and Push Docker Images

This project uses Google Cloud Build to build and push service images to Artifact Registry — no local Docker install required.

Repeat for each service in the `/services` directory (`batch_processor_dispatcher`, `summaries_generator`, `transcription_generator`, `previews_generator`):

```bash
export PROJECT_ID="your-gcp-project-id"
export REPO="media-pipeline-images"
export REGION="us-central1"
export IMAGE_NAME="batch_processor_dispatcher"

gcloud builds submit ./services/${IMAGE_NAME}/ \
  --project=${PROJECT_ID} \
  --tag="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:latest"
```

After pushing all images, update your `terraform.tfvars` with the image paths and re-run `terraform apply`.

### 3. Apply Terraform

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This provisions: GCS buckets, Pub/Sub topics and subscriptions, Cloud Run services, Firestore database, Artifact Registry, service accounts, IAM bindings, Vertex AI Search data store, and a BigQuery dead-letter table.

### 4. Deploy the Presentation Layer

The UI frontend and backend are deployed separately via Cloud Build:

```bash
cd presentation

# Deploy both frontend and backend
./deploy.sh all

# Or deploy individually
./deploy.sh ui        # Frontend only
./deploy.sh backend   # Backend only
```

The deploy script reads `GOOGLE_CLOUD_PROJECT` from your `gcloud` config. The UI's `API_URL` environment variable is automatically wired to the backend's Cloud Run URL by Terraform.

### 5. Enable Vertex AI Search

Terraform creates an empty data store, but you need to manually connect it to Firestore and create a search app:

1. Go to **AI Applications** > **Data Stores** and connect the created data store to your Firestore database.
2. Wait for indexing to complete.
3. Go to **AI Applications** > **Apps** > **Create App**.
4. Choose **Custom Search (general)**.
5. Set the app name and location to `global`.
6. Attach the data store you just connected.
7. Copy the engine ID and update `vais_engine_id` in your `terraform.tfvars`, then re-apply Terraform.

### 6. Configure GCS CORS (Required for Browser Uploads)

The upload feature requires CORS to be configured on the input bucket:

```bash
gsutil cors set presentation/cors.json gs://your-gcp-project-id-input
```

---

## How to Use

### Finding Your Service URLs

After deployment, get the Cloud Run URLs:

```bash
# All services at once
gcloud run services list --region=us-central1 --format='table(SERVICE, URL)'

# Individual service URLs
gcloud run services describe nebula-foundry-ui --region=us-central1 --format='value(status.url)'
gcloud run services describe nebula-foundry-ui-backend --region=us-central1 --format='value(status.url)'
```

### Via the Web UI

1.  Navigate to the deployed UI URL (the Cloud Run URL for `nebula-foundry-ui`).
2.  **Browse**: View all processed media assets with their metadata, summaries, and chapters.
3.  **Upload**: Go to `/upload`, drop or select a video file. The file uploads directly to GCS, and the pipeline triggers automatically. The UI polls for status updates until processing completes.
4.  **Search**: Use the search bar to find content via Vertex AI Search.
5.  **Chat**: Open any media asset and use the AI chat to ask questions about the content.
6.  **Settings**: Click the settings icon in the header to configure your API key.

### Via CLI / Manual Trigger

1.  **Upload a file to GCS**:

    ```bash
    gsutil cp my-video.mp4 gs://your-gcp-project-id-input/
    ```

2.  **Publish a pipeline trigger message**:

    ```bash
    gcloud pubsub topics publish central-ingestion-topic \
      --message='{"asset_id": "unique-asset-id-123", "file_name": "my-video.mp4", "file_location": "gs://your-gcp-project-id-input/my-video.mp4", "content_type": "video/mp4", "file_category": "video"}'
    ```

3.  **Monitor in Firestore**: View the `media_assets` collection in the Firebase console. The `summary`, `transcription`, and `previews` fields update as each service completes.

---

## Presentation Layer

The UI is split into two Cloud Run services:

```
Browser → UI (Next.js :3000) → UI-Backend (Express :8080) → Firestore / GCS / Vertex AI
```

### Frontend (`nebula-foundry-ui`)

-   Next.js 15, TypeScript, Radix UI, TailwindCSS
-   Pages: Browse, Movies, Upload, Search, Inspire Me, Profiles, Sports, Preview
-   Supports both GCS-hosted and YouTube video playback

### Backend API (`nebula-foundry-ui-backend`)

-   Express.js + Socket.io + Google Genkit

| Endpoint | Method | Description |
|---|---|---|
| `/api/movies` | GET | Fetch media assets from Firestore with signed URLs |
| `/api/search?q=` | GET | Search via Vertex AI Search (VAIS) |
| `/api/upload/signed-url` | POST | Generate signed URL for direct GCS upload |
| `/api/upload/publish` | POST | Publish to Pub/Sub to trigger the pipeline |
| `/api/upload/status/:assetId` | GET | Poll processing status from Firestore |
| WebSocket `chat message` | - | Real-time AI chat about content (Gemini) |

All `/api/*` endpoints require an `X-API-Key` header when `API_KEY` is configured on the backend.

---

## Local Development

### Backend (ui-backend)

```bash
cd presentation/ui-backend
npm install
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node server.js
# Runs on port 3001
```

### Frontend (ui)

```bash
cd presentation/ui
npm install
npm run dev
# Runs on port 9002 (Turbopack)
```

Create `presentation/ui/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Service Accounts

Terraform creates the following service accounts with least-privilege permissions:

| Service Account | Used By | Key Permissions |
|---|---|---|
| `batch-processor-sa` | Batch Processor Dispatcher | Pub/Sub subscribe + publish, Firestore read/write |
| `metadata-generator-sa` | Summaries, Transcription, Previews generators | GCS object admin, Firestore read/write, Vertex AI user, Speech admin |
| `nebula-foundry-ui-sa` | UI Frontend | Discovery Engine viewer |
| `ui-backend-sa` | UI Backend | Firebase admin, Firestore read/write, Vertex AI user, Discovery Engine viewer, Service Account Token Creator (for GCS signed URLs) |

Additionally, Terraform grants the **Vertex AI Service Agent** (`service-PROJECT_NUMBER@gcp-sa-aiplatform.iam.gserviceaccount.com`) read access to GCS, since Vertex AI reads files directly when given a `gs://` URI.

---

## Pub/Sub Topics

| Topic | Purpose |
|---|---|
| `central-ingestion-topic` | Entry point — triggers the dispatcher |
| `summaries-generation-topic` | Routes to summary generator |
| `transcription-generation-topic` | Routes to transcription generator |
| `previews-generation-topic` | Routes to preview generator |
| `dead-letter-topic` | Failed messages (routed to BigQuery) |

---

## Gotchas & Known Issues

### Service Account Creation

-   **Terraform may fail on first apply** if the IAM API hasn't fully propagated. If you see errors creating service accounts, wait a minute and re-run `terraform apply`.
-   **Deleted service accounts cause conflicts.** If you destroy and re-create infrastructure, GCP retains deleted service account IDs for 30 days. You'll get an error like `"Service account already exists"` even though it was deleted. Either wait 30 days, use `gcloud iam service-accounts undelete`, or choose a different `account_id`.
-   **Cloud Build service account** (`PROJECT_NUMBER@cloudbuild.gserviceaccount.com`) must exist before Terraform can grant it Artifact Registry permissions. Enable the Cloud Build API first: `gcloud services enable cloudbuild.googleapis.com`.

### Pub/Sub & Cloud Run

-   **Pub/Sub push requires the service account token creator role.** Without the `iam.serviceAccountTokenCreator` binding on the Pub/Sub service agent, push subscriptions to Cloud Run will silently fail with 403 errors.
-   **Dead-letter topic needs subscriber permission.** The Pub/Sub service agent needs `pubsub.subscriber` on each subscription that uses a dead-letter policy — Terraform handles this, but if you create subscriptions manually, don't forget it.

### Transcription Service

-   **Concurrency is set to 1.** The Cloud Speech-to-Text API throttles heavily, so the transcription generator is limited to a single concurrent request. This is intentional — increasing it will cause API quota errors.
-   **Resource-intensive.** The transcription and previews generators are allocated 8 vCPUs and 32 GB RAM due to FFmpeg and video processing requirements.

### Upload Feature

-   **GCS CORS must be configured** on the upload bucket for browser-based uploads to work. Without it, uploads will fail with opaque network errors. See [Configure GCS CORS](#6-configure-gcs-cors-required-for-browser-uploads).
-   **Signed URL generation requires `iam.serviceAccountTokenCreator`** on the UI backend service account. The backend self-impersonates to create signed URLs — if this role is missing, uploads will fail with a "Could not generate signed URL" error.

### API Key Authentication

-   **API key auth is optional** — if the `API_KEY` environment variable is not set on the backend, all requests are allowed through. This is convenient for development but not recommended for production.
-   **The frontend stores the API key in `localStorage`**, keyed as `nebula_foundry_api_key`. It sends it as an `X-API-Key` header on every request. Configure it via the settings dialog (gear icon in the header).

### Vertex AI Search (VAIS)

-   **Search won't work until you manually create the search app** in the Google Cloud console and connect the data store to Firestore. Terraform only creates the empty data store.
-   **VAIS uses the project _number_ (not project ID)** for its API calls. Terraform handles this via the `data.google_project.project.number` data source.

### Vertex AI / Gemini

-   **The Vertex AI Service Agent needs GCS read access.** When you pass a `gs://` URI to Gemini, it's the Vertex AI service agent (not your Cloud Run service account) that reads the file. Without `roles/storage.objectViewer` on this agent, Gemini calls will fail with permission denied errors.

### Terraform

-   **Enable prerequisite APIs before running Terraform.** `serviceusage.googleapis.com` and `cloudresourcemanager.googleapis.com` must be enabled manually — Terraform can't enable them because it needs them to enable other APIs.
-   **Two-phase deployment.** On a fresh project, run `terraform apply` first with the default placeholder images, then build/push your actual Docker images, update image variables in `.tfvars`, and run `terraform apply` again.

---
