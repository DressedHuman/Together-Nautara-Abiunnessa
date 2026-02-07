export interface User {
    id: string;
    email: string;
    phone: string;
    role: 'alumni' | 'coordinator' | 'committee';
    is_verified: boolean;
}

export interface Batch {
    id: string;
    year: number;
    display_name: string;
    alumni_count?: number;
}

export interface AlumniProfile {
    id: string;
    user: string;
    batch: string;
    batch_year?: number;
    roll: string;
    section: string;
    full_name_bn: string;
    full_name_en: string;
    city: string;
    country: string;
    profession: string;
    company: string;
    university: string;
    bio: string;
    facebook: string;
    linkedin: string;
    photo: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface LoginCredentials {
    email?: string;
    phone?: string;
    password: string;
}

export interface RegisterData {
    email: string;
    phone: string;
    password: string;
    password_confirm: string;
}

export interface ApiError {
    detail?: string;
    [key: string]: unknown;
}

export interface PaginatedResponse<T> {
    results: T[];
    total: number;
    pages: number;
    current_page: number;
    has_next: boolean;
    has_previous: boolean;
}
