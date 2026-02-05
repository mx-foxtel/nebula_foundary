import { logger } from "./logger";

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';

logger.log(`Resolved API Target URL: ${API_URL}`);

async function fetchApi(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, options);
  
  logger.log(`fetchAPI result: ${res}`)

  if (!res.ok) {
    const errorText = await res.text();
    logger.error(`failed to call api ${API_URL}${path}: ${errorText}`)
    throw new Error(`API call to ${path} failed with status ${res.status}: ${errorText}`);
  }

  const responseText = await res.text();
  try {
    const res = responseText ? JSON.parse(responseText) : {};
    return res
  } catch (error) {
    logger.error(`Failed to parse JSON response from ${path}:`, responseText);
    throw new Error(`API call to ${path} returned invalid JSON.`);
  }
}

export async function search(query: string) {
  logger.log(`search ${query}`);
  const searchParams = new URLSearchParams({ q: query });
  const result = await fetchApi(`/api/search?${searchParams.toString()}`)
  logger.log(`search returned results: ${result.toString()}`)
  return result ;
}

export async function getMovies() {
  logger.log(`getMovies`);
  return fetchApi('/api/movies');
}

export async function getSignedUploadUrl(fileName: string, contentType: string) {
  logger.log(`getSignedUploadUrl: ${fileName}`);
  return fetchApi('/api/upload/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType }),
  });
}

export async function publishUpload(
  assetId: string,
  fileName: string,
  filePath: string,
  contentType: string
) {
  logger.log(`publishUpload: ${assetId}`);
  return fetchApi('/api/upload/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId, fileName, filePath, contentType }),
  });
}

export async function getAssetStatus(assetId: string) {
  logger.log(`getAssetStatus: ${assetId}`);
  return fetchApi(`/api/upload/status/${encodeURIComponent(assetId)}`);
}