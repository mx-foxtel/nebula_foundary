#!/bin/bash

# Deployment script for services to Google Cloud Run.
#
# Configuration Variables (can be set via environment or sourced):
export GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)
export GCP_REGION="us-central1"
export AR_REPO_NAME="media-pipeline-images"

set -e # Exit immediately if a command exits with a non-zero status.

if [ -z "$GOOGLE_CLOUD_PROJECT" ] || [ -z "$GCP_REGION" ] || [ -z "$AR_REPO_NAME" ] ; then
    echo "Error: Required environment variables (GOOGLE_CLOUD_PROJECT, GCP_REGION, AR_REPO_NAME) are not set."
    exit 1
fi

# Define the full base path for the images in Artifact Registry
BASE_IMAGE_TAG="${GCP_REGION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${AR_REPO_NAME}"
DEPLOY_CONFIG_FILE="cloudbuild.yaml"

# Function to submit a deployment job via Cloud Build
submit_deployment() {
  local SERVICE_DIR=$1 # ui or ui-backend
  local SERVICE_NAME=$2
  local SERVICE_DIR="./${SERVICE_DIR}"
  
  echo "Deploying ${SERVICE_NAME} via Cloud Build... ${SERVICE_DIR}"
  
  # Image previously published by artifact_publish.sh
  local IMAGE_TAG="${BASE_IMAGE_TAG}/${SERVICE_NAME}:latest" 

  # The build context (--dir) is the service directory, 
  # and the config file is expected inside it.
  gcloud builds submit "$SERVICE_DIR" --config="${SERVICE_DIR}/${DEPLOY_CONFIG_FILE}" \
    --substitutions=_IMAGE_TAG=${IMAGE_TAG},_DOCKERFILE_PATH=Dockerfile,_SERVICE_NAME=${SERVICE_NAME},_REGION=${GCP_REGION}
}

# Function to deploy the backend using Cloud Build
deploy_backend() {
  submit_deployment "ui-backend" "nebula-foundry-ui-backend"
}

# Function to deploy the UI using Cloud Build
deploy_ui() {
  # Resolve the backend URL for NEXT_PUBLIC_API_URL (must be baked in at build time)
  local BACKEND_URL
  BACKEND_URL=$(gcloud run services describe nebula-foundry-ui-backend \
    --region="${GCP_REGION}" --format='value(status.url)' 2>/dev/null || echo "")

  if [ -z "$BACKEND_URL" ]; then
    echo "Error: Could not resolve backend URL. Deploy the backend first (./deploy.sh backend) or set NEXT_PUBLIC_API_URL env var."
    echo "You can also run './deploy.sh all' which deploys the backend before the UI."
    exit 1
  fi

  # Allow override via env var (e.g. for custom domains)
  BACKEND_URL="${NEXT_PUBLIC_API_URL:-$BACKEND_URL}"
  echo "Using backend URL: ${BACKEND_URL}"

  local SERVICE_DIR="./ui"
  local SERVICE_NAME="nebula-foundry-ui"
  local IMAGE_TAG="${BASE_IMAGE_TAG}/${SERVICE_NAME}:latest"

  echo "Deploying ${SERVICE_NAME} via Cloud Build... ${SERVICE_DIR}"

  gcloud builds submit "$SERVICE_DIR" --config="${SERVICE_DIR}/${DEPLOY_CONFIG_FILE}" \
    --substitutions=_IMAGE_TAG=${IMAGE_TAG},_DOCKERFILE_PATH=Dockerfile,_SERVICE_NAME=${SERVICE_NAME},_REGION=${GCP_REGION},_NEXT_PUBLIC_API_URL=${BACKEND_URL},_NEXT_PUBLIC_API_KEY=${NEXT_PUBLIC_API_KEY:-}
}

# Main logic
case "$1" in
  ui)
    deploy_ui
    ;;
  backend)
    deploy_backend
    ;;
  all)
    deploy_backend
    deploy_ui
    ;;
  *)
    echo "Usage: $0 {ui|backend|all}"
    echo "No argument provided, deploying all."
    deploy_backend
    deploy_ui
    ;;
esac