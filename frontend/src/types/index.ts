export type Role = 'alumni' | 'coordinator' | 'committee';
export type ProfileStatus = 'pending' | 'approved' | 'rejected';

export interface User {
    id: string;
    email: string;
    phone: string;
    role: Role;
    is_verified: boolean;
    has_profile: boolean;
    profile_status: ProfileStatus | null;
    created_at: string;
}

export interface Batch {
    id: string;
    year: number;
    display_name: string;
    alumni_count: number;
}

export interface Coordinator {
    id: string;
    name: string | null;
    user: { id: string; email: string; phone: string; role: Role };
    created_at: string;
}

export interface BatchDetail extends Batch {
    coordinators: Coordinator[];
    pending_count: number;
    created_at: string;
}

/** The signed-in user's own profile. */
export interface AlumniProfile {
    id: string;
    batch_year: number;
    batch_name: string;
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
    status: ProfileStatus;
    review_note: string;
    recommended: boolean;
    created_at: string;
    updated_at: string;
}

/** A card in the directory. */
export interface AlumniCard {
    id: string;
    full_name_en: string;
    full_name_bn: string;
    batch_year: number;
    batch_name?: string;
    profession: string;
    company: string;
    city: string;
    country: string;
    photo: string | null;
}

/** A public profile page. Member-only fields are absent for visitors. */
export interface PublicProfile extends AlumniCard {
    university: string;
    bio: string;
    roll?: string;
    section?: string;
    facebook?: string;
    linkedin?: string;
    members_only_hidden: boolean;
}

/** What coordinators and the committee see. */
export interface ReviewProfile extends AlumniCard {
    roll: string;
    section: string;
    university: string;
    bio: string;
    facebook: string;
    linkedin: string;
    email: string;
    phone: string;
    status: ProfileStatus;
    review_note: string;
    recommended_by: string | null;
    recommended_at: string | null;
    approved_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ApprovalLogEntry {
    id: string;
    alumni: string;
    alumni_name: string;
    batch_year: number;
    actor: string | null;
    status: 'approved' | 'rejected' | 'recommended';
    note: string;
    created_at: string;
}

export interface Paginated<T> {
    results: T[];
    total: number;
    pages: number;
    current_page: number;
    has_next: boolean;
    has_previous: boolean;
}

export interface DirectoryFilterOptions {
    batches: number[];
    professions: string[];
    countries: string[];
    cities: string[];
}

export interface SiteStats {
    alumni: number;
    batches: number;
    countries: number;
    professions: number;
}

export interface AuthResponse {
    access: string;
    refresh: string;
    user: User;
}
