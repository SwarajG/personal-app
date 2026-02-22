import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type PersonStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

interface UserSummary {
  id: string
  email: string
  name?: string
  avatar?: string
}

export interface Person {
  id: string
  userId: string
  addedUserId: string
  alias: string
  relationship?: string
  status: PersonStatus
  createdAt: string
  updatedAt: string
  addedUser: UserSummary
  user: UserSummary
}

export interface PeopleResponse {
  accepted: Person[]
  pendingSent: Person[]
  pendingReceived: Person[]
}

interface AddPersonRequest {
  addedUserId: string
  alias?: string
  relationship?: string
}

export const peopleApi = createApi({
  reducerPath: 'peopleApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:4000/api',
    credentials: 'include',
  }),
  tagTypes: ['People'],
  endpoints: (builder) => ({
    searchUsers: builder.query<UserSummary[], string>({
      query: (q) => `/users/search?q=${encodeURIComponent(q)}`,
    }),
    getPeople: builder.query<PeopleResponse, void>({
      query: () => '/people',
      providesTags: ['People'],
    }),
    addPerson: builder.mutation<Person, AddPersonRequest>({
      query: (data) => ({
        url: '/people',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['People'],
    }),
    acceptPerson: builder.mutation<Person, string>({
      query: (id) => ({
        url: `/people/${id}/accept`,
        method: 'PATCH',
      }),
      invalidatesTags: ['People'],
    }),
    declinePerson: builder.mutation<void, string>({
      query: (id) => ({
        url: `/people/${id}/decline`,
        method: 'PATCH',
      }),
      invalidatesTags: ['People'],
    }),
    removePerson: builder.mutation<void, string>({
      query: (id) => ({
        url: `/people/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['People'],
    }),
  }),
})

export const {
  useSearchUsersQuery,
  useLazySearchUsersQuery,
  useGetPeopleQuery,
  useAddPersonMutation,
  useAcceptPersonMutation,
  useDeclinePersonMutation,
  useRemovePersonMutation,
} = peopleApi
