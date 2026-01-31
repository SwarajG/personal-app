import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, Trash2, Mail, User } from 'lucide-react'
import { useLazySearchUsersQuery, useGetPeopleQuery, useAddPersonMutation, useRemovePersonMutation } from '@/api/peopleApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface SearchResult {
  id: string
  email: string
  name?: string
  avatar?: string
}

export default function MyPeople() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
  const [alias, setAlias] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<string | null>(null)
  
  const [searchUsers, { data: searchData, isFetching }] = useLazySearchUsersQuery()
  const { data: people, isLoading: isPeopleLoading } = useGetPeopleQuery()
  const [addPerson, { isLoading: isAdding }] = useAddPersonMutation()
  const [removePerson, { isLoading: isRemoving }] = useRemovePersonMutation()

  // Debounce search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchUsers])

  // Update search results when data arrives
  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData)
      setShowResults(true)
    }
  }, [searchData])

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user)
    setAlias(user.name?.split(' ')[0] || user.email.split('@')[0])
    setIsDialogOpen(true)
    setShowResults(false)
    setSearchQuery('')
  }

  const handleAddPerson = async () => {
    if (!selectedUser) return

    try {
      await addPerson({
        addedUserId: selectedUser.id,
        alias: alias.trim() || undefined,
      }).unwrap()
      toast.success(`${alias} added to your people list`)
      setIsDialogOpen(false)
      setSelectedUser(null)
      setAlias('')
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to add person')
    }
  }

  const handleRemovePerson = async () => {
    if (!personToDelete) return

    try {
      await removePerson(personToDelete).unwrap()
      toast.success('Person removed from your list')
      setPersonToDelete(null)
    } catch (error) {
      toast.error('Failed to remove person')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">My People</h1>
        <p className="text-muted-foreground mt-2">Manage your connections and relationships here.</p>
      </div>

      {/* Search Section */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="pl-10"
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
            {isFetching && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user.name || 'No name'}</div>
                  <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                </div>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isFetching && (
          <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
            No users found
          </div>
        )}
      </div>

      {/* People List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your People ({people?.length || 0})</h2>
        
        {isPeopleLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading your people...
          </div>
        ) : people && people.length > 0 ? (
          <div className="grid gap-4">
            {people.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={person.addedUser.avatar} />
                  <AvatarFallback>
                    {person.addedUser.name?.charAt(0) || person.addedUser.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{person.alias}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{person.addedUser.email}</span>
                  </div>
                  {person.addedUser.name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{person.addedUser.name}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setPersonToDelete(person.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No people added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Search for someone using the search box above</p>
          </div>
        )}
      </div>

      {/* Add Person Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Your People</DialogTitle>
            <DialogDescription>
              Add an alias for {selectedUser?.email}. This will help you identify them easily.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedUser?.avatar} />
                <AvatarFallback>
                  {selectedUser?.name?.charAt(0) || selectedUser?.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{selectedUser?.name || 'No name'}</div>
                <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="alias" className="text-sm font-medium">
                Alias / Nickname
              </label>
              <Input
                id="alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Enter an alias"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Default: {selectedUser?.name?.split(' ')[0] || selectedUser?.email.split('@')[0]}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPerson} disabled={isAdding}>
              {isAdding ? 'Adding...' : 'Add Person'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!personToDelete} onOpenChange={() => setPersonToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Person</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this person from your list? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPersonToDelete(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemovePerson}
              disabled={isRemoving}
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
