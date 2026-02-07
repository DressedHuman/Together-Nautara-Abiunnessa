import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import alumniReducer from '../features/alumni/alumniSlice';
import batchReducer from '../features/batch/batchSlice';
import directoryReducer from '../features/directory/directorySlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        alumni: alumniReducer,
        batch: batchReducer,
        directory: directoryReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
