export type ApiMode = 'mock' | 'live';

// Inlined at build time by vite.config.ts. Defaults to 'mock' so a fresh deploy never needs a backend.
export const API_MODE: ApiMode = process.env.NEXT_PUBLIC_API_MODE === 'live' ? 'live' : 'mock';
export const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
