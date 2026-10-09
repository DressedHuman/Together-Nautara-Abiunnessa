import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Same-origin by default: Vite proxies /api in development, and in production
// either serve both behind one domain or set VITE_API_URL to the API's origin.
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export const tokens = {
    get access() {
        return read(ACCESS);
    },
    get refresh() {
        return read(REFRESH);
    },
    set(access: string, refresh?: string) {
        try {
            localStorage.setItem(ACCESS, access);
            if (refresh) localStorage.setItem(REFRESH, refresh);
        } catch {
            /* storage unavailable: session lasts until reload */
        }
    },
    clear() {
        try {
            localStorage.removeItem(ACCESS);
            localStorage.removeItem(REFRESH);
        } catch {
            /* ignore */
        }
    },
};

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
    const token = tokens.access;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// One refresh at a time; concurrent 401s wait for the same promise.
let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
    const refresh = tokens.refresh;
    if (!refresh) return null;
    try {
        const { data } = await axios.post(`${API_URL}/auth/refresh-token/`, { refresh });
        tokens.set(data.access, data.refresh);
        return data.access as string;
    } catch {
        tokens.clear();
        window.dispatchEvent(new Event('auth:expired'));
        return null;
    }
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const isAuthCall = original?.url?.includes('/auth/') && !original.url.includes('/auth/me/');
        if (error.response?.status === 401 && original && !original._retry && !isAuthCall && tokens.refresh) {
            original._retry = true;
            refreshing = refreshing ?? refreshAccess().finally(() => (refreshing = null));
            const access = await refreshing;
            if (access) {
                original.headers.Authorization = `Bearer ${access}`;
                return api(original);
            }
        }
        return Promise.reject(error);
    }
);

/** Turn a DRF error into a single human sentence plus per-field messages. */
export function parseError(error: unknown, fallback = 'Something went wrong. Please try again.') {
    const err = error as AxiosError<Record<string, unknown>>;
    const fields: Record<string, string> = {};
    if (!err?.response) {
        return { message: err?.code === 'ECONNABORTED' ? 'The server took too long to answer.' : 'Could not reach the server. Check your connection.', fields, status: 0, data: {} as Record<string, unknown> };
    }
    const data = err.response.data ?? {};
    let message = '';
    if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
            const text = Array.isArray(value) ? String(value[0]) : typeof value === 'string' ? value : '';
            if (!text) continue;
            if (key === 'detail' || key === 'non_field_errors') message = text;
            else fields[key] = text;
        }
    }
    if (err.response.status === 429) message = 'Too many attempts. Please wait a minute and try again.';
    if (!message && Object.keys(fields).length) message = 'Please fix the highlighted fields.';
    return { message: message || fallback, fields, status: err.response.status, data: data as Record<string, unknown> };
}

export default api;
