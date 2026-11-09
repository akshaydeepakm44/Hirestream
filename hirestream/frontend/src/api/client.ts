import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Clean and normalize API base URL
const rawApiUrl = import.meta.env.VITE_API_URL;
export const API_URL: string = (rawApiUrl && typeof rawApiUrl === 'string')
    ? rawApiUrl.replace(/\/+$/, '')
    : '';

if (import.meta.env.PROD && !API_URL) {
    console.warn(
        '[HireStream Warning] VITE_API_URL is not defined in production. ' +
        'API calls will fall back to relative paths, which requires a reverse proxy or SPA rewrite rule.'
    );
}

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor: attach bearer token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: detect HTML returned instead of JSON (common Vercel SPA rewrite trap)
api.interceptors.response.use(
    (response: AxiosResponse) => {
        const contentType = response.headers['content-type'] || '';
        // If an API request receives text/html instead of application/json, it's an SPA rewrite fallback
        if (typeof response.data === 'string' && (contentType.includes('text/html') || response.data.trim().startsWith('<!doctype html>'))) {
            return Promise.reject(new Error(
                `API endpoint returned an HTML document instead of JSON. The backend service may be unconfigured or unreachable. (URL: ${response.config.url})`
            ));
        }
        return response;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

/**
 * Utility to safely extract an array from arbitrary API responses.
 * Protects against HTML fallbacks, error objects, and null values crashing .map().
 */
export function safeArray<T>(data: unknown, fallback: T[] = []): T[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        const record = data as Record<string, unknown>;
        if (Array.isArray(record.results)) return record.results as T[];
        if (Array.isArray(record.data)) return record.data as T[];
        if (Array.isArray(record.items)) return record.items as T[];
    }
    return fallback;
}
