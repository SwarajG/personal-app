import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type NotificationType =
  | 'CO_POST_RECEIVED'
  | 'CO_POST_ACCEPTED'
  | 'CO_POST_DECLINED'
  | 'CO_POST_CONTRIBUTED'
  | 'PERSON_REQUEST_RECEIVED'
  | 'PERSON_REQUEST_ACCEPTED'
  | 'PERSON_REQUEST_DECLINED'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  postId?: string
  personId?: string
  read: boolean
  createdAt: string
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:4000/api',
    credentials: 'include',
  }),
  tagTypes: ['Notifications'],
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllReadMutation,
} = notificationsApi
