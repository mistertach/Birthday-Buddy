import { api } from './client';
import { Contact, ContactInput } from '../types';

export const contactsApi = {
    list: () => api<Contact[]>('/api/v1/contacts'),
    get: (id: string) => api<Contact>(`/api/v1/contacts/${id}`),
    create: (data: ContactInput) =>
        api<Contact>('/api/v1/contacts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ContactInput>) =>
        api<Contact>(`/api/v1/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
        api<{ ok: boolean }>(`/api/v1/contacts/${id}`, { method: 'DELETE' }),
    markWished: (id: string, wished: boolean) =>
        api<{ ok: boolean }>(`/api/v1/contacts/${id}/wished`, {
            method: 'POST',
            body: JSON.stringify({ wished }),
        }),
};
