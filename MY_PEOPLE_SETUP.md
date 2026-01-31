# My People Feature - Setup Instructions

## Database Migration

Run the following command in the backend directory to create the database migration:

```bash
cd apps/backend
npx prisma migrate dev --name add_people_table
```

This will:
1. Create a new migration file for the Person model
2. Update your database schema
3. Generate the updated Prisma client

## What's Been Implemented

### Backend (apps/backend)
1. **Prisma Schema** - Added `Person` model with relationships
2. **API Endpoints**:
   - `GET /api/users/search?q=<email_prefix>` - Search users by email
   - `GET /api/people` - Get user's people list
   - `POST /api/people` - Add person to list
   - `DELETE /api/people/:id` - Remove person from list

### Frontend (apps/web)
1. **API Layer** (`src/api/peopleApi.ts`):
   - Redux RTK Query setup for people management
   - Integrated with Redux store

2. **MyPeople Component** (`src/pages/MyPeople.tsx`):
   - ✅ Search input with 300ms debounce
   - ✅ Live search results dropdown
   - ✅ Click to select user from search results
   - ✅ Dialog to add person with alias input
   - ✅ Default alias (first name or email prefix)
   - ✅ People list display with avatars
   - ✅ Delete functionality with confirmation
   - ✅ Toast notifications for success/error

## Features
- **Debounced Search**: Search triggers 300ms after user stops typing
- **Smart Defaults**: Auto-fills alias with first name or email prefix
- **Validation**: Can't add yourself or duplicate entries
- **Real-time Updates**: List refreshes automatically after add/remove
- **User-friendly UI**: Beautiful avatars, hover effects, and responsive design

## Testing
1. Start the backend: `cd apps/backend && npm run dev`
2. Start the frontend: `cd apps/web && npm run dev`
3. Navigate to "My People" from the sidebar
4. Search for users by email
5. Click on a user to add them with an alias
