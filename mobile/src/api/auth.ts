import { api } from './client';
import { User } from '../types';

export type AuthResponse = { token: string; user: User };

export const authApi = {
    login: (email: string, password: string) =>
        api<AuthResponse>('/api/auth/mobile/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    register: (name: string, email: string, password: string) =>
        api<AuthResponse>('/api/auth/mobile/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        }),
    me: () => api<User & { wantsEmailNotifications: boolean; wishesDelivered: number; streak: number }>('/api/v1/me'),
};
