import { api } from './client';
import { PartyEvent, EventInput } from '../types/index';

export const eventsApi = {
    list: () => api<PartyEvent[]>('/api/v1/events'),
    create: (data: EventInput) =>
        api<PartyEvent>('/api/v1/events', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<EventInput>) =>
        api<PartyEvent>(`/api/v1/events/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    remove: (id: string) =>
        api<void>(`/api/v1/events/${id}`, { method: 'DELETE' }),
};
