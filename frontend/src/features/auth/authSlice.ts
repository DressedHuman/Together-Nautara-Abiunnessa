import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { tokens } from '../../lib/api';
import { authService } from '../../services';
import type { AuthResponse, User } from '../../types';

interface AuthState {
    user: User | null;
    /** 'checking' while a stored session is being restored on page load. */
    status: 'checking' | 'ready';
}

const initialState: AuthState = {
    user: null,
    status: tokens.access ? 'checking' : 'ready',
};

/** Restore the session from stored tokens. */
export const loadSession = createAsyncThunk('auth/loadSession', async () => {
    if (!tokens.access) return null;
    try {
        return await authService.me();
    } catch {
        tokens.clear();
        return null;
    }
});

export const refreshUser = createAsyncThunk('auth/refreshUser', () => authService.me());

export const logout = createAsyncThunk('auth/logout', async () => {
    const refresh = tokens.refresh;
    tokens.clear();
    try {
        await authService.logout(refresh);
    } catch {
        /* already signed out locally */
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        signedIn: (state, action: PayloadAction<AuthResponse>) => {
            tokens.set(action.payload.access, action.payload.refresh);
            state.user = action.payload.user;
            state.status = 'ready';
        },
        sessionExpired: (state) => {
            state.user = null;
            state.status = 'ready';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadSession.fulfilled, (state, action) => {
                state.user = action.payload;
                state.status = 'ready';
            })
            .addCase(refreshUser.fulfilled, (state, action) => {
                state.user = action.payload;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
            });
    },
});

export const { signedIn, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
