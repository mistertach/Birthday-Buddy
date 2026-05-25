const DEFAULT_BASE_URL = 'http://localhost:3000';

export function getBaseUrl(): string {
    return process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;
}

export type ApiError = {
    status: number;
    error: string;
    details?: unknown;
};

let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
    currentToken = token;
}

export async function api<T = unknown>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const url = `${getBaseUrl()}${path}`;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
    };
    if (currentToken) {
        headers.Authorization = `Bearer ${currentToken}`;
    }

    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    const body = text ? safeJson(text) : null;

    if (!res.ok) {
        const err: ApiError = {
            status: res.status,
            error: (body as any)?.error || res.statusText || 'Request failed',
            details: (body as any)?.details,
        };
        throw err;
    }
    return body as T;
}

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
