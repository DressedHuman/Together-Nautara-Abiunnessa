import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../lib/api';
import type { AlumniProfile, PaginatedResponse } from '../../types';

interface DirectoryFilters {
    search?: string;
    batch?: string;
    profession?: string;
    country?: string;
    city?: string;
    page?: number;
    page_size?: number;
}

interface DirectoryState {
    alumni: AlumniProfile[];
    selectedAlumni: AlumniProfile | null;
    total: number;
    pages: number;
    currentPage: number;
    filters: DirectoryFilters;
    loading: boolean;
    error: string | null;
}

const initialState: DirectoryState = {
    alumni: [],
    selectedAlumni: null,
    total: 0,
    pages: 0,
    currentPage: 1,
    filters: {
        page: 1,
        page_size: 12,
    },
    loading: false,
    error: null,
};

export const searchDirectory = createAsyncThunk(
    'directory/search',
    async (filters: DirectoryFilters, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.batch) params.append('batch', filters.batch);
            if (filters.profession) params.append('profession', filters.profession);
            if (filters.country) params.append('country', filters.country);
            if (filters.city) params.append('city', filters.city);
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.page_size) params.append('page_size', filters.page_size.toString());

            const { data } = await api.get(`/directory/?${params.toString()}`);
            return { ...data, filters };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Search failed');
        }
    }
);

export const fetchAlumniById = createAsyncThunk(
    'directory/fetchById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/directory/${id}/`);
            return data;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch alumni');
        }
    }
);

const directorySlice = createSlice({
    name: 'directory',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<DirectoryFilters>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = initialState.filters;
        },
        clearSelectedAlumni: (state) => {
            state.selectedAlumni = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(searchDirectory.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(searchDirectory.fulfilled, (state, action: PayloadAction<PaginatedResponse<AlumniProfile> & { filters: DirectoryFilters }>) => {
                state.loading = false;
                state.alumni = action.payload.results;
                state.total = action.payload.total;
                state.pages = action.payload.pages;
                state.currentPage = action.payload.current_page;
                state.filters = action.payload.filters;
            })
            .addCase(searchDirectory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchAlumniById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAlumniById.fulfilled, (state, action: PayloadAction<AlumniProfile>) => {
                state.loading = false;
                state.selectedAlumni = action.payload;
            })
            .addCase(fetchAlumniById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setFilters, clearFilters, clearSelectedAlumni } = directorySlice.actions;
export default directorySlice.reducer;
