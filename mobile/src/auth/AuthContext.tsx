import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../api/client';
import { authApi } from '../api/auth';
import { User } from '../types';

const TOKEN_KEY = 'bb_mobile_token';

type AuthState = {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(TOKEN_KEY);
                if (stored) {
                    setAuthToken(stored);
                    setToken(stored);
                    const me = await authApi.me();
                    setUser({ id: me.id, email: me.email, name: me.name, isAdmin: me.isAdmin });
                }
            } catch {
                await AsyncStorage.removeItem(TOKEN_KEY);
                setAuthToken(null);
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const persist = useCallback(async (t: string, u: User) => {
        await AsyncStorage.setItem(TOKEN_KEY, t);
        setAuthToken(t);
        setToken(t);
        setUser(u);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await authApi.login(email, password);
        await persist(res.token, res.user);
    }, [persist]);

    const register = useCallback(async (name: string, email: string, password: string) => {
        const res = await authApi.register(name, email, password);
        await persist(res.token, res.user);
    }, [persist]);

    const logout = useCallback(async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setToken(null);
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading, login, register, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
