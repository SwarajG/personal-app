import { useState } from 'react'
import { ChevronDown, ChevronUp, Users, X } from 'lucide-react'
import { useGetPeopleQuery } from '@/api/peopleApi'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface Person {
  id: string
  addedUserId: string
  alias: string
  addedUser: {
    id: string
    email: string
    name?: string
    avatar?: string
  }
}

interface CoAuthorPickerProps {
  selected: Person | null
  onSelect: (person: Person | null) => void
}

export function CoAuthorPicker({ selected, onSelect }: CoAuthorPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: peopleData, isLoading } = useGetPeopleQuery()
  const people = peopleData?.accepted ?? []

  const getInitials = (person: Person) => {
    const name = person.alias || person.addedUser.name || person.addedUser.email
    return name.slice(0, 2).toUpperCase()
  }

  const getDisplayName = (person: Person) => {
    const realName = person.addedUser.name
    return realName ? `${person.alias} — ${realName}` : person.alias
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Users className="h-4 w-4" />
        <span>Share with someone?</span>
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isExpanded && (
        <div className="mt-2">
          {selected ? (
            <div className="flex items-center gap-2 bg-accent rounded-lg px-3 py-2 w-fit">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selected.addedUser.avatar || ''} />
                <AvatarFallback className="text-xs">{getInitials(selected)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{selected.alias}</span>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-muted-foreground px-3 py-2">Loading...</p>
              ) : people.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-2">
                  No people added yet. Add someone in My People first.
                </p>
              ) : (
                people.map((person) => (
                  <Button
                    key={person.id}
                    type="button"
                    variant="ghost"
                    className="w-full justify-start gap-2 px-3 py-2 h-auto rounded-none border-b last:border-b-0"
                    onClick={() => {
                      onSelect(person as Person)
                      setIsExpanded(false)
                    }}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={person.addedUser.avatar || ''} />
                      <AvatarFallback className="text-xs">{getInitials(person as Person)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{getDisplayName(person as Person)}</span>
                  </Button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
