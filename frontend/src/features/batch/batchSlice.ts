import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../lib/api';
import type { Batch } from '../../types';

interface BatchState {
    batches: Batch[];
    loading: boolean;
    error: string | null;
}

const initialState: BatchState = {
    batches: [],
    loading: false,
    error: null,
};

export const fetchBatches = createAsyncThunk(
    'batch/fetchBatches',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/batches/');
            return data;
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            return rejectWithValue(err.response?.data?.detail || 'Failed to fetch batches');
        }
    }
);

const batchSlice = createSlice({
    name: 'batch',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchBatches.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBatches.fulfilled, (state, action: PayloadAction<Batch[]>) => {
                state.loading = false;
                state.batches = action.payload;
            })
            .addCase(fetchBatches.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default batchSlice.reducer;
