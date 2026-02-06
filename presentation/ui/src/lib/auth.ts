const API_KEY_STORAGE_KEY = 'nebula_foundry_api_key';

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_KEY || '';
  }
  return localStorage.getItem(API_KEY_STORAGE_KEY) || process.env.NEXT_PUBLIC_API_KEY || '';
}

export function setStoredApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  if (apiKey) {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export function hasApiKey(): boolean {
  return Boolean(getStoredApiKey());
}
