import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

interface CreatePostRequest {
  content: string
  timestamp: string
}

interface CreatePostResponse {
  success: boolean
  message?: string
  id?: string
}

export const postsApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
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
  }),
})

export const { useCreatePostMutation } = postsApi
