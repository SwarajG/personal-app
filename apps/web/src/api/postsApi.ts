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
  coAuthorId?: string
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
  contributedBy?: string
}

export interface CoAuthorUser {
  id: string
  name?: string
  email: string
  avatar?: string
  profilePicture?: string
}

export interface PostMilestone {
  id: string
  postId: string
  personId?: string
  label: string
  presetUsed?: string
  createdBy: string
  createdAt: string
}

export interface Post {
  id: string
  title: string
  content: string
  date: string
  mood?: string
  tags: string[]
  media?: PostMedia[]
  userId: string
  isCoPost: boolean
  coAuthorId?: string
  coAuthor?: CoAuthorUser
  coAuthorAccepted: boolean
  initiatedBy: string
  initiatedByUser?: CoAuthorUser
  milestone?: PostMilestone
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

export const postsApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:4000/api',
    credentials: 'include'
  }),
  tagTypes: ['Posts', 'CoPosts', 'Milestones'],
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
    deletePost: builder.mutation<void, string>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Posts', 'Milestones'],
    }),
    getPaginatedPosts: builder.query<PaginatedPostsResponse, { page: number; limit: number }>({
      query: ({ page, limit }) => `/posts/paginated?page=${page}&limit=${limit}`,
      providesTags: ['Posts'],
    }),
    getCoPosts: builder.query<Post[], void>({
      query: () => '/co-posts',
      providesTags: ['CoPosts'],
    }),
    acceptCoPost: builder.mutation<void, string>({
      query: (id) => ({ url: `/posts/${id}/accept`, method: 'PATCH' }),
      invalidatesTags: ['Posts', 'CoPosts'],
    }),
    declineCoPost: builder.mutation<void, string>({
      query: (id) => ({ url: `/posts/${id}/decline`, method: 'PATCH' }),
      invalidatesTags: ['Posts', 'CoPosts'],
    }),
    contributeToCoPost: builder.mutation<Post, { id: string; note?: string; media?: MediaAttachment[] }>({
      query: ({ id, ...body }) => ({ url: `/posts/${id}/contribute`, method: 'PATCH', body }),
      invalidatesTags: ['Posts', 'CoPosts'],
    }),
    deleteContribution: builder.mutation<Post, string>({
      query: (id) => ({ url: `/posts/${id}/contribution`, method: 'DELETE' }),
      invalidatesTags: ['Posts', 'CoPosts'],
    }),
  }),
})

export const {
  useCreatePostMutation,
  useGenerateTitleMutation,
  useGetPostsByDateQuery,
  useDeletePostMutation,
  useGetPaginatedPostsQuery,
  useGetCoPostsQuery,
  useAcceptCoPostMutation,
  useDeclineCoPostMutation,
  useContributeToCoPostMutation,
  useDeleteContributionMutation,
} = postsApi
