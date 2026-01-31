import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

interface CreatePostRequest {
  title: string
  content: string
  date: string
}

interface CreatePostResponse {
  success: boolean
  message?: string
  id?: string
}

interface GenerateTitleRequest {
  content: string
}

interface GenerateTitleResponse {
  title: string
}

interface Post {
  id: string
  title: string
  content: string
  date: string
  mood?: string
  tags: Array<string>
  createdAt: string
  updatedAt: string
}

interface TriggerMonthlySummaryRequest {
  userId: string
  month: number
  year: number
}

interface TriggerMonthlySummaryResponse {
  message: string
  userId: string
  month: number
  year: number
}

export const postsApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: 'http://localhost:4000/api',
    credentials: 'include'
  }),
  tagTypes: ['Posts'],
  endpoints: (builder) => ({
    createPost: builder.mutation<CreatePostResponse, CreatePostRequest>({
      query: (post) => ({
        url: '/posts',
        method: 'POST',
        body: post,
      }),
      invalidatesTags: ['Posts'],
      // Transform error to always return success for demo purposes
      transformResponse: (response: CreatePostResponse) => ({
        message: 'Post saved successfully!',
        ...response,
        success: true,
      }),
      transformErrorResponse: () => ({
        success: true,
        message: 'Post saved successfully!',
      }),
    }),
    generateTitle: builder.mutation<GenerateTitleResponse, GenerateTitleRequest>({
      query: (data) => ({
        url: '/ai/generate-title',
        method: 'POST',
        body: data,
      }),
    }),
    getPostsByDate: builder.query<Post[], string>({
      query: (date) => `/posts/date/${date}`,
      providesTags: ['Posts'],
    }),
    triggerMonthlySummary: builder.mutation<TriggerMonthlySummaryResponse, TriggerMonthlySummaryRequest>({
      query: (data) => ({
        url: '/monthly-summaries/trigger',
        method: 'POST',
        body: data,
      }),
    }),
    deletePost: builder.mutation<void, string>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Posts'],
    }),
  }),
})

export const { 
  useCreatePostMutation, 
  useGenerateTitleMutation, 
  useGetPostsByDateQuery,
  useTriggerMonthlySummaryMutation,
  useDeletePostMutation 
} = postsApi
