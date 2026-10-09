import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { alumniService } from '../../services';
import type { AlumniProfile } from '../../types';
import { logout } from '../auth/authSlice';

interface AlumniState {
    profile: AlumniProfile | null;
    /** 'missing' means the user hasn't created a profile yet. */
    status: 'idle' | 'loading' | 'loaded' | 'missing' | 'error';
}

const initialState: AlumniState = { profile: null, status: 'idle' };

export const fetchMyProfile = createAsyncThunk('alumni/fetchMyProfile', async (_, { rejectWithValue }) => {
    try {
        return await alumniService.mine();
    } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        return rejectWithValue(status === 404 ? 'missing' : 'error');
    }
});

const alumniSlice = createSlice({
    name: 'alumni',
    initialState,
    reducers: {
        profileSaved: (state, action: PayloadAction<AlumniProfile>) => {
            state.profile = action.payload;
            state.status = 'loaded';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyProfile.pending, (state) => {
                if (state.status !== 'loaded') state.status = 'loading';
            })
            .addCase(fetchMyProfile.fulfilled, (state, action) => {
                state.profile = action.payload;
                state.status = 'loaded';
            })
            .addCase(fetchMyProfile.rejected, (state, action) => {
                state.profile = null;
                state.status = action.payload === 'missing' ? 'missing' : 'error';
            })
            .addCase(logout.fulfilled, () => initialState);
    },
});

export const { profileSaved } = alumniSlice.actions;
export default alumniSlice.reducer;
