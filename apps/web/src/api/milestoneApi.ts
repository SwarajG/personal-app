import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface MilestonePost {
  id: string
  title: string
  date: string
  media: { fileKey: string; fileType: string; fileUrl?: string }[]
}

export interface MilestonePerson {
  id: string
  alias: string
  relationship?: string
}

export interface Milestone {
  id: string
  postId: string
  personId?: string
  label: string
  presetUsed?: string
  createdBy: string
  createdAt: string
  post?: MilestonePost
  person?: MilestonePerson
}

interface AddMilestoneRequest {
  postId: string
  label: string
  personId?: string
  presetUsed?: string
}

export const milestoneApi = createApi({
  reducerPath: 'milestoneApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:4000/api',
    credentials: 'include',
  }),
  tagTypes: ['Milestones', 'RelationshipMilestones'],
  endpoints: (builder) => ({
    addOrUpdateMilestone: builder.mutation<Milestone, AddMilestoneRequest>({
      query: ({ postId, ...body }) => ({
        url: `/posts/${postId}/milestone`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Milestones', 'RelationshipMilestones'],
    }),
    removeMilestone: builder.mutation<void, string>({
      query: (postId) => ({
        url: `/posts/${postId}/milestone`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Milestones', 'RelationshipMilestones'],
    }),
    getRelationshipMilestones: builder.query<Milestone[], string>({
      query: (personId) => `/relationships/${personId}/milestones`,
      providesTags: ['RelationshipMilestones'],
    }),
    getMyMilestones: builder.query<Milestone[], void>({
      query: () => '/users/me/milestones',
      providesTags: ['Milestones'],
    }),
  }),
})

export const {
  useAddOrUpdateMilestoneMutation,
  useRemoveMilestoneMutation,
  useGetRelationshipMilestonesQuery,
  useGetMyMilestonesQuery,
} = milestoneApi
