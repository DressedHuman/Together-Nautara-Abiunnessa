import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../lib/api';
import type { User, AuthTokens, LoginCredentials, RegisterData } from '../../types';

interface AuthState {
    user: User | null;
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: !!localStorage.getItem('access_token'),
    loading: false,
    error: null,
};

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: LoginCredentials, { rejectWithValue }) => {
        try {
            const endpoint = credentials.email ? '/auth/login/email/' : '/auth/login/phone/';
            const { data } = await api.post(endpoint, credentials);

            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);

            return data;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Login failed');
        }
    }
);

export const register = createAsyncThunk(
    'auth/register',
    async (data: RegisterData, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/register/', data);
            return response.data;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Registration failed');
        }
    }
);

export const fetchCurrentUser = createAsyncThunk(
    'auth/fetchCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/auth/me/');
            return data;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch user');
        }
    }
);

export const logout = createAsyncThunk('auth/logout', async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
        await api.post('/auth/logout/', { refresh: refreshToken });
    } catch {
        // Ignore errors
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action: PayloadAction<{ user: User; access: string; refresh: string }>) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.tokens = { access: action.payload.access, refresh: action.payload.refresh };
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(register.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(register.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.user = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.tokens = null;
                state.isAuthenticated = false;
            });
    },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
