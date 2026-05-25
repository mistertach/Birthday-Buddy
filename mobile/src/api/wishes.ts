import { api } from './client';

export type Tone = 'casual' | 'warm' | 'fun' | 'professional';

export const wishesApi = {
    generate: (contactId: string, tone: Tone, belated = false) =>
        api<{ message: string }>(`/api/v1/contacts/${contactId}/wish`, {
            method: 'POST',
            body: JSON.stringify({ tone, belated }),
        }),
};
