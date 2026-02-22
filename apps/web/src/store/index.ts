import { configureStore } from '@reduxjs/toolkit'
import { postsApi } from '../api/postsApi'
import { peopleApi } from '../api/peopleApi'
import { notificationsApi } from '../api/notificationsApi'
import { milestoneApi } from '../api/milestoneApi'
import authReducer from './authSlice'

export const store = configureStore({
  reducer: {
    [postsApi.reducerPath]: postsApi.reducer,
    [peopleApi.reducerPath]: peopleApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [milestoneApi.reducerPath]: milestoneApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(postsApi.middleware)
      .concat(peopleApi.middleware)
      .concat(notificationsApi.middleware)
      .concat(milestoneApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
