import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Search, UserPlus, Trash2, Mail, User, Clock, Check, X, Users, Flag, BookOpen } from 'lucide-react'
import {
  useLazySearchUsersQuery,
  useGetPeopleQuery,
  useAddPersonMutation,
  useAcceptPersonMutation,
  useDeclinePersonMutation,
  useRemovePersonMutation,
} from '@/api/peopleApi'
import type { Person } from '@/api/peopleApi'
import { useGetRelationshipMilestonesQuery } from '@/api/milestoneApi'
import type { Milestone } from '@/api/milestoneApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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

// ── Relationship Milestones Dialog ────────────────────────────────────────────

function RelationshipMilestonesDialog({
  person,
  open,
  onOpenChange,
}: {
  person: Person
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: milestones = [], isLoading } = useGetRelationshipMilestonesQuery(person.id, { skip: !open })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-500" />
            Story with {person.alias}
          </DialogTitle>
          <DialogDescription>
            Milestone moments in your relationship, oldest to newest.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading milestones…</div>
        )}

        {!isLoading && milestones.length === 0 && (
          <div className="py-10 text-center space-y-2">
            <Flag className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No milestones yet</p>
            <p className="text-xs text-muted-foreground">
              Tag a shared post as a milestone moment and it will appear here.
            </p>
          </div>
        )}

        {!isLoading && milestones.length > 0 && (
          <ol className="relative border-l border-amber-200 dark:border-amber-800 ml-3 space-y-6 py-2">
            {milestones.map((m: Milestone) => (
              <li key={m.id} className="ml-4">
                <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-amber-400 bg-background" />
                <div className="flex gap-3 items-start">
                  {m.post?.media?.[0]?.fileUrl && (
                    <img
                      src={m.post.media[0].fileUrl}
                      alt=""
                      className="h-14 w-14 rounded-md object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Flag className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        {m.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate">{m.post?.title}</p>
                    <time className="text-xs text-muted-foreground">
                      {m.post?.date ? format(new Date(m.post.date), 'MMMM d, yyyy') : ''}
                    </time>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  )
}

const RELATIONSHIP_OPTIONS = [
  'Wife',
  'Husband',
  'Partner',
  'Girlfriend',
  'Boyfriend',
  'Mother',
  'Father',
  'Sister',
  'Brother',
  'Daughter',
  'Son',
  'Best Friend',
  'Friend',
  'Colleague',
  'Other',
]

interface SearchResult {
  id: string
  email: string
  name?: string
  avatar?: string
}

function PersonCard({
  person,
  actions,
}: {
  person: Person
  actions?: React.ReactNode
}) {
  // For received requests, the "other" user is person.user (the requester)
  // For sent requests and accepted, the "other" user is person.addedUser
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
      <Avatar className="h-12 w-12">
        <AvatarImage src={person.addedUser.avatar} />
        <AvatarFallback>
          {person.addedUser.name?.charAt(0) || person.addedUser.email.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{person.alias}</span>
          {person.relationship && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {person.relationship}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{person.addedUser.email}</span>
        </div>
        {person.addedUser.name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3 w-3 flex-shrink-0" />
            <span>{person.addedUser.name}</span>
          </div>
        )}
      </div>

      {actions}
    </div>
  )
}

function ReceivedCard({
  person,
  actions,
}: {
  person: Person
  actions?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
      <Avatar className="h-12 w-12">
        <AvatarImage src={person.user.avatar} />
        <AvatarFallback>
          {person.user.name?.charAt(0) || person.user.email.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{person.user.name || person.user.email}</span>
          {person.relationship && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {person.relationship}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{person.user.email}</span>
        </div>
      </div>

      {actions}
    </div>
  )
}

export default function MyPeople() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
  const [alias, setAlias] = useState('')
  const [relationship, setRelationship] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null)
  const [milestonePerson, setMilestonePerson] = useState<Person | null>(null)

  const [searchUsers, { data: searchData, isFetching }] = useLazySearchUsersQuery()
  const { data: people, isLoading: isPeopleLoading } = useGetPeopleQuery()
  const [addPerson, { isLoading: isAdding }] = useAddPersonMutation()
  const [acceptPerson, { isLoading: isAccepting }] = useAcceptPersonMutation()
  const [declinePerson, { isLoading: isDeclining }] = useDeclinePersonMutation()
  const [removePerson, { isLoading: isRemoving }] = useRemovePersonMutation()

  const accepted = people?.accepted ?? []
  const pendingSent = people?.pendingSent ?? []
  const pendingReceived = people?.pendingReceived ?? []

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

  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData)
      setShowResults(true)
    }
  }, [searchData])

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user)
    setAlias(user.name?.split(' ')[0] || user.email.split('@')[0])
    setRelationship('')
    setIsDialogOpen(true)
    setShowResults(false)
    setSearchQuery('')
  }

  const handleSendRequest = async () => {
    if (!selectedUser) return
    try {
      await addPerson({
        addedUserId: selectedUser.id,
        alias: alias.trim() || undefined,
        relationship: relationship || undefined,
      }).unwrap()
      toast.success(`Connection request sent to ${alias}`)
      setIsDialogOpen(false)
      setSelectedUser(null)
      setAlias('')
      setRelationship('')
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to send request')
    }
  }

  const handleAccept = async (id: string) => {
    try {
      await acceptPerson(id).unwrap()
      toast.success('Connection accepted!')
    } catch {
      toast.error('Failed to accept request')
    }
  }

  const handleDecline = async (id: string) => {
    try {
      await declinePerson(id).unwrap()
      toast.success('Request declined')
    } catch {
      toast.error('Failed to decline request')
    }
  }

  const handleRemove = async () => {
    if (!personToDelete) return
    try {
      await removePerson(personToDelete.id).unwrap()
      toast.success('Connection removed')
      setPersonToDelete(null)
    } catch {
      toast.error('Failed to remove connection')
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">My People</h1>
        <p className="text-muted-foreground mt-2">
          Search for people and send connection requests to stay connected.
        </p>
      </div>

      {/* Search Section */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email to find people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="pl-10"
          />
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
            {isFetching && (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
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

      {isPeopleLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Pending Received Requests */}
          {pendingReceived.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Requests Received</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-semibold">
                  {pendingReceived.length}
                </span>
              </div>
              <div className="grid gap-3">
                {pendingReceived.map((person) => (
                  <ReceivedCard
                    key={person.id}
                    person={person}
                    actions={
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(person.id)}
                          disabled={isAccepting}
                          className="gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecline(person.id)}
                          disabled={isDeclining}
                          className="gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Pending Sent Requests */}
          {pendingSent.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Requests Sent</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
                  {pendingSent.length}
                </span>
              </div>
              <div className="grid gap-3">
                {pendingSent.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    actions={
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Pending</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          title="Cancel request"
                          onClick={() => setPersonToDelete(person)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Accepted Connections */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              Your People{' '}
              <span className="text-muted-foreground font-normal text-base">
                ({accepted.length})
              </span>
            </h2>

            {accepted.length > 0 ? (
              <div className="grid gap-3">
                {accepted.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    actions={
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-amber-500"
                          onClick={() => setMilestonePerson(person)}
                          title="View shared milestones"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setPersonToDelete(person)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No connections yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Search for someone and send them a connection request
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Send Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Connection Request</DialogTitle>
            <DialogDescription>
              Send a request to {selectedUser?.email}. They will be notified and can accept or
              decline.
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
                Nickname / Alias
              </label>
              <Input
                id="alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Enter a nickname"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="relationship" className="text-sm font-medium">Relationship</label>
              <Select
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="">Select a relationship (optional)</option>
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button onClick={handleSendRequest} disabled={isAdding} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {isAdding ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relationship Milestones Dialog */}
      {milestonePerson && (
        <RelationshipMilestonesDialog
          person={milestonePerson}
          open={!!milestonePerson}
          onOpenChange={(open) => { if (!open) setMilestonePerson(null) }}
        />
      )}

      {/* Remove / Cancel Confirmation Dialog */}
      <Dialog open={!!personToDelete} onOpenChange={() => setPersonToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {personToDelete?.status === 'PENDING' ? 'Cancel Request' : 'Remove Connection'}
            </DialogTitle>
            <DialogDescription>
              {personToDelete?.status === 'PENDING'
                ? 'Are you sure you want to cancel this connection request?'
                : 'Are you sure you want to remove this person from your connections? This will also remove you from their list.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPersonToDelete(null)} disabled={isRemoving}>
              Keep
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isRemoving}>
              {isRemoving
                ? 'Removing...'
                : personToDelete?.status === 'PENDING'
                  ? 'Cancel Request'
                  : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
