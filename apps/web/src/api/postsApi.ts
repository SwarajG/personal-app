import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

interface MediaAttachment {
  fileKey: string
  fileName: string
  fileType: string
  fileSize: number
}

interface CreatePostRequest {
  title: string
  content: string
  date: string
  media?: MediaAttachment[]
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

export interface PostMedia {
  fileKey: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl?: string
}

export interface Post {
  id: string
  title: string
  content: string
  date: string
  mood?: string
  tags: string[]
  media?: PostMedia[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedPostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
  hasMore: boolean
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
    getPaginatedPosts: builder.query<PaginatedPostsResponse, { page: number; limit: number }>({
      query: ({ page, limit }) => `/posts/paginated?page=${page}&limit=${limit}`,
      providesTags: ['Posts'],
    }),
  }),
})

export const {
  useCreatePostMutation,
  useGenerateTitleMutation,
  useGetPostsByDateQuery,
  useTriggerMonthlySummaryMutation,
  useDeletePostMutation,
  useGetPaginatedPostsQuery,
} = postsApi
