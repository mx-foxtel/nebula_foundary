# Nebula Foundry - Introductory Video Transcript

---

## SCENE 1: Opening (15 seconds)

**[Show Nebula Foundry logo + architecture diagram]**

Hi, welcome to Nebula Foundry — an event-driven media metadata generation pipeline built on Google Cloud Platform. Upload a video, and it automatically generates rich summaries, transcriptions, and video previews using AI — all serverless, all scalable.

---

## SCENE 2: Architecture Overview (45 seconds)

**[Show architecture diagram]**

```
                            ┌─────────────────────────┐
                            │   Browser / Web UI      │
                            │   (Next.js on Cloud Run)│
                            └───────────┬─────────────┘
                                        │
                            ┌───────────▼─────────────┐
                            │   UI Backend API        │
                            │   (Express.js + Genkit) │
                            │   Cloud Run :8080       │
                            └──┬──────┬──────┬────────┘
                               │      │      │
                    ┌──────────▼┐  ┌──▼───┐  ▼─────────────┐
                    │ Firestore │  │ GCS  │  │ Vertex AI    │
                    │ (metadata)│  │(files)│  │ Search (VAIS)│
                    └───────────┘  └──┬───┘  └──────────────┘
                                      │
                         Upload / File Event
                                      │
                            ┌─────────▼──────────┐
                            │  Pub/Sub            │
                            │  central-ingestion  │
                            └─────────┬──────────┘
                                      │
                            ┌─────────▼──────────┐
                            │  Batch Processor    │
                            │  Dispatcher         │
                            └──┬──────┬──────┬───┘
                               │      │      │
              ┌────────────────▼┐  ┌──▼────────────┐  ┌──▼────────────┐
              │ Summaries       │  │ Transcription  │  │ Previews      │
              │ Generator       │  │ Generator      │  │ Generator     │
              │ (Gemini 2.5     │  │ (Cloud Speech- │  │ (Gemini 2.5   │
              │  Flash)         │  │  to-Text Chirp)│  │  Flash)       │
              └────────┬────────┘  └───────┬────────┘  └──────┬────────┘
                       │                   │                   │
                       └───────────────────▼───────────────────┘
                                           │
                                   ┌───────▼───────┐
                                   │   Firestore   │
                                   │ (results +    │
                                   │  status)      │
                                   └───────────────┘
```

Here's how it works. When you upload a video — either through the web UI or directly to a Cloud Storage bucket — a message is published to the central ingestion Pub/Sub topic. The Batch Processor Dispatcher picks it up, creates a Firestore record, and fans out three parallel tasks: one for summaries, one for transcription, and one for video previews. Each runs as an independent Cloud Run service. Results are written back to Firestore, and the UI picks them up.

---

## SCENE 3: Accessing the Application (20 seconds)

**[Show Cloud Shell with gcloud commands]**

After deployment, you can find your service URLs with:

```
gcloud run services list --region=us-central1 --format='table(SERVICE, URL)'
```

You'll see six Cloud Run services:

| Service | URL |
|---|---|
| `nebula-foundry-ui` | `https://nebula-foundry-ui-<project-number>.us-central1.run.app` |
| `nebula-foundry-ui-backend` | `https://nebula-foundry-ui-backend-<project-number>.us-central1.run.app` |
| `batch-processor-dispatcher` | `https://batch-processor-dispatcher-<project-number>.us-central1.run.app` |
| `summaries-generator` | `https://summaries-generator-<project-number>.us-central1.run.app` |
| `transcription-generator` | `https://transcription-generator-<project-number>.us-central1.run.app` |
| `previews-generator` | `https://previews-generator-<project-number>.us-central1.run.app` |

Open the `nebula-foundry-ui` URL — that's the main application.

---

## SCENE 4: Setting Up the API Key (30 seconds)

**[Show browser with the UI, click settings gear icon]**

All backend API endpoints are secured with API key authentication. The key is set during Terraform deployment:

```
terraform apply -var="api_key=$(uuidgen)"
```

This configures the backend to require an `X-API-Key` header on every request. To set it in the UI:

1. Click the **settings gear icon** in the top-right corner of the header.
2. Enter your API key in the dialog.
3. Click **Save**.

The key is stored in your browser's local storage and automatically sent with every API call. Without it, you'll see 401 Unauthorized errors.

If no API key is configured on the backend, authentication is skipped — convenient for local development, but not recommended for production.

---

## SCENE 5: Navigating the UI (60 seconds)

**[Walk through each menu item]**

The app has four main navigation items:

### Home (Browse)
**[Show the /browse page]**

When you first open the app, you're greeted with a **"Who's watching?"** profile selector — Thomas, Matilda, or Kids. Pick a profile and you land on the **Browse** page, which shows your media library in a streaming-service-style layout with categories and carousels.

### Movies
**[Show the /movies page with cards]**

The **Movies** page shows all processed media assets in a grid view. Each card displays the video poster, title, and processing status. Click any card to open the **detail view**, which shows:

- **Video player** — plays GCS-hosted or YouTube videos inline
- **AI-generated summary** — a narrative description of the content
- **Chapters** — timestamped sections identified by Gemini
- **Categories** — mood, themes, subjects, characters
- **Transcription** — full speech-to-text with word count
- **Preview clips** — AI-identified highlights with timecodes
- **Processing status badges** — shows whether summary, transcription, and previews are completed, pending, or failed

You can toggle between a **categorized view** and a **raw JSON view** of all metadata.

### Upload
**[Show the /upload page, drag a file]**

The **Upload** page lets you drag and drop a video file — or click to select one. Here's what happens:

1. The frontend requests a **signed URL** from the backend.
2. Your browser uploads the file **directly to Cloud Storage** — no size limits from the backend.
3. The backend publishes a message to Pub/Sub, which triggers the entire pipeline.
4. The UI **polls for status** every 5 seconds, showing real-time progress as each service completes.

### What to Watch (Inspire Me)
**[Show the /inspire-me page]**

**What to Watch** is a recommendation-style page that helps you discover content from your library. It presents videos in a curated, discovery-oriented layout.

### Search
**[Show the search bar and /search results page]**

The **search bar** in the header uses **Vertex AI Search** (VAIS) — Google's enterprise search engine. Type a query, and you get:

- An **AI-generated summary** of the most relevant results
- A **references grid** showing matching videos with poster images, titles, and contextual snippets
- A **debug panel** (collapsible) showing the raw API response

Search works across all metadata — summaries, transcriptions, categories, and file names.

---

## SCENE 6: AI Models Under the Hood (45 seconds)

**[Show a table or side-by-side of models]**

Nebula Foundry uses five different AI models, each purpose-built for its task:

| Service | Model | What It Does |
|---|---|---|
| **Summaries Generator** | **Gemini 2.5 Flash** | Generates narrative summaries, chapters with timestamps, mood analysis, theme extraction, character identification. Uses structured JSON output schemas for consistency. |
| **Transcription Generator** | **Chirp** (Cloud Speech-to-Text) | Extracts audio via FFmpeg, runs long-form English speech recognition. Returns word-level timing data for precise transcripts. |
| **Previews Generator** | **Gemini 2.5 Flash** | Watches the video and identifies 5 key scenes suitable for trailers or shorts. Each clip has start/end timecodes, a summary, and emotional tone. Minimum 30 seconds per scene. |
| **Chat** | **Gemini 1.5 Flash** (via Genkit) | Powers the real-time chat feature. Acts as a media expert, answering questions about video content grounded in the metadata. |
| **Search** | **Vertex AI Search** (Discovery Engine) | Enterprise-grade search across all metadata. Supports query expansion, spell correction, and AI-powered result summaries. |

All models are configurable via Terraform variables. For example, you can swap the summaries model to `gemini-2.5-pro` for higher quality at the cost of speed:

```hcl
summaries_generator_llm_model    = "gemini-2.5-pro"
transcription_generator_llm_model = "chirp"
previews_generator_llm_model     = "gemini-2.5-flash"
```

---

## SCENE 7: Infrastructure at a Glance (20 seconds)

**[Show Terraform output or GCP console]**

Everything is deployed with Terraform — a single `terraform apply` creates:

- **6 Cloud Run services** — UI, UI Backend, Dispatcher, and 3 generators
- **5 Pub/Sub topics** — for event routing plus a dead-letter topic backed by BigQuery
- **4 service accounts** — following least-privilege (dispatcher, generators, UI, UI backend)
- **Firestore** — the central metadata store
- **Cloud Storage** — input buckets for media files
- **Artifact Registry** — Docker image repository
- **Vertex AI Search** — data store for enterprise search

---

## SCENE 8: Closing (10 seconds)

**[Show the browse page with processed videos]**

That's Nebula Foundry — upload a video, and AI does the rest. Summaries, transcriptions, previews, and search — all generated automatically on Google Cloud.

Check out the README for deployment instructions and known gotchas. Thanks for watching.

---

**Total estimated runtime: ~4 minutes**
