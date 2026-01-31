import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

interface User {
  id: string
  email: string
  name?: string
  avatar?: string
}

interface Person {
  id: string
  userId: string
  addedUserId: string
  alias: string
  createdAt: string
  updatedAt: string
  addedUser: User
}

interface AddPersonRequest {
  addedUserId: string
  alias?: string
}

export const peopleApi = createApi({
  reducerPath: 'peopleApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: 'http://localhost:4000/api',
    credentials: 'include'
  }),
  tagTypes: ['People'],
  endpoints: (builder) => ({
    searchUsers: builder.query<User[], string>({
      query: (q) => `/users/search?q=${encodeURIComponent(q)}`,
    }),
    getPeople: builder.query<Person[], void>({
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
  useRemovePersonMutation,
} = peopleApi
