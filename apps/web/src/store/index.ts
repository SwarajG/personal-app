import { configureStore } from '@reduxjs/toolkit'
import { postsApi } from '../api/postsApi'
import authReducer from './authSlice'

export const store = configureStore({
  reducer: {
    [postsApi.reducerPath]: postsApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(postsApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
