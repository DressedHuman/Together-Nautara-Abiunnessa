import api from '../lib/api';
import type {
    AlumniCard,
    AlumniProfile,
    ApprovalLogEntry,
    AuthResponse,
    Batch,
    BatchDetail,
    DirectoryFilterOptions,
    Paginated,
    PublicProfile,
    ReviewProfile,
    SiteStats,
    User,
} from '../types';

type Params = Record<string, string | number | undefined>;

function clean(params: Params = {}) {
    return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined));
}

export const authService = {
    register: (data: { email: string; phone: string; password: string; password_confirm: string }) =>
        api.post<{ message: string; email: string }>('/auth/register/', data).then((r) => r.data),
    loginEmail: (email: string, password: string) =>
        api.post<AuthResponse>('/auth/login-email/', { email, password }).then((r) => r.data),
    loginPhone: (phone: string, password: string) =>
        api.post<AuthResponse>('/auth/login-phone/', { phone, password }).then((r) => r.data),
    verifyOtp: (email: string, otp: string) =>
        api.post<AuthResponse>('/auth/verify-otp/', { email, otp }).then((r) => r.data),
    requestOtp: (email: string) => api.post('/auth/request-otp/', { email, purpose: 'verify' }),
    requestReset: (email: string) => api.post('/auth/password-reset/', { email }),
    confirmReset: (email: string, otp: string, new_password: string) =>
        api.post('/auth/password-reset/confirm/', { email, otp, new_password }),
    changePassword: (current_password: string, new_password: string) =>
        api.post<AuthResponse>('/auth/change-password/', { current_password, new_password }).then((r) => r.data),
    me: () => api.get<User>('/auth/me/').then((r) => r.data),
    logout: (refresh: string | null) => api.post('/auth/logout/', { refresh }),
};

export const alumniService = {
    mine: () => api.get<AlumniProfile>('/alumni/me/').then((r) => r.data),
    create: (form: FormData) => api.post<AlumniProfile>('/alumni/me/', form).then((r) => r.data),
    update: (form: FormData) => api.put<AlumniProfile>('/alumni/me/', form).then((r) => r.data),
};

export const directoryService = {
    search: (params: Params) =>
        api.get<Paginated<AlumniCard>>('/directory/', { params: clean(params) }).then((r) => r.data),
    profile: (id: string) => api.get<PublicProfile>(`/directory/${id}/`).then((r) => r.data),
    filters: () => api.get<DirectoryFilterOptions>('/directory/filters/').then((r) => r.data),
    stats: () => api.get<SiteStats>('/directory/stats/').then((r) => r.data),
};

export const batchService = {
    list: () => api.get<Batch[]>('/batches/').then((r) => r.data),
    listDetailed: () => api.get<BatchDetail[]>('/batches/', { params: { detail: 1 } }).then((r) => r.data),
    create: (year: number, display_name: string) =>
        api.post<BatchDetail>('/batches/', { year, display_name }).then((r) => r.data),
    rename: (year: number, display_name: string) =>
        api.patch<BatchDetail>(`/batches/${year}/`, { display_name }).then((r) => r.data),
    remove: (year: number) => api.delete(`/batches/${year}/`),
    addCoordinator: (year: number, email: string) =>
        api.post<BatchDetail>(`/batches/${year}/coordinators/`, { email }).then((r) => r.data),
    removeCoordinator: (year: number, id: string) =>
        api.delete<BatchDetail>(`/batches/${year}/coordinators/${id}/`).then((r) => r.data),
};

export const approvalService = {
    pending: (params: Params) =>
        api.get<Paginated<ReviewProfile>>('/approvals/pending/', { params: clean(params) }).then((r) => r.data),
    alumni: (params: Params) =>
        api.get<Paginated<ReviewProfile>>('/approvals/alumni/', { params: clean(params) }).then((r) => r.data),
    stats: () =>
        api.get<{ pending: number; approved: number; rejected: number; recommended: number }>('/approvals/stats/').then((r) => r.data),
    approve: (id: string, note = '') => api.post(`/approvals/${id}/approve/`, { note }),
    reject: (id: string, note = '') => api.post(`/approvals/${id}/reject/`, { note }),
    logs: (params: Params = {}) =>
        api.get<ApprovalLogEntry[]>('/approvals/logs/', { params: clean(params) }).then((r) => r.data),
};

export const coordinatorService = {
    batchAlumni: (params: Params) =>
        api
            .get<Paginated<ReviewProfile> & { batches: number[] }>('/coordinator/batch-alumni/', { params: clean(params) })
            .then((r) => r.data),
    recommend: (alumni_id: string, note = '') => api.post('/coordinator/verify-alumni/', { alumni_id, note }),
};
