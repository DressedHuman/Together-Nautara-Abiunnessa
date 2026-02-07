import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../lib/api';
import type { AlumniProfile } from '../../types';

interface AlumniState {
    profile: AlumniProfile | null;
    loading: boolean;
    error: string | null;
}

const initialState: AlumniState = {
    profile: null,
    loading: false,
    error: null,
};

export const fetchMyProfile = createAsyncThunk(
    'alumni/fetchMyProfile',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/alumni/me/');
            return data;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch profile');
        }
    }
);

export const createProfile = createAsyncThunk(
    'alumni/createProfile',
    async (profileData: FormData, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/alumni/me/', profileData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Failed to create profile');
        }
    }
);

export const updateProfile = createAsyncThunk(
    'alumni/updateProfile',
    async (profileData: FormData, { rejectWithValue }) => {
        try {
            const { data } = await api.put('/alumni/me/', profileData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Failed to update profile');
        }
    }
);

const alumniSlice = createSlice({
    name: 'alumni',
    initialState,
    reducers: {
        clearProfile: (state) => {
            state.profile = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMyProfile.fulfilled, (state, action: PayloadAction<AlumniProfile>) => {
                state.loading = false;
                state.profile = action.payload;
            })
            .addCase(fetchMyProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createProfile.fulfilled, (state, action: PayloadAction<AlumniProfile>) => {
                state.loading = false;
                state.profile = action.payload;
            })
            .addCase(createProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(updateProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, action: PayloadAction<AlumniProfile>) => {
                state.loading = false;
                state.profile = action.payload;
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearProfile } = alumniSlice.actions;
export default alumniSlice.reducer;
