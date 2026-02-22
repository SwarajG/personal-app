import { useState, useEffect } from 'react'
import { Flag, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useAddOrUpdateMilestoneMutation,
  useRemoveMilestoneMutation,
} from '@/api/milestoneApi'
import type { PostMilestone } from '@/api/postsApi'
import type { Person } from '@/api/peopleApi'

const PRESET_SUGGESTIONS = [
  'The day we met',
  'First trip together',
  'Got through something hard',
  "A moment I'll never forget",
  'When everything changed',
  'First time I realised',
  'A goodbye',
  'A new beginning',
  'Proud of us',
]

const MAX_LABEL = 60

interface MilestoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  isCoPost: boolean
  coAuthorId?: string
  /** Existing milestone (for editing) */
  existing?: PostMilestone
  /** Accepted people list for optional relationship linking on personal posts */
  people?: Person[]
  /** Called after a successful save (with new label) or removal (undefined) */
  onSaved?: (label?: string) => void
}

export function MilestoneDialog({
  open,
  onOpenChange,
  postId,
  isCoPost,
  existing,
  people = [],
  onSaved,
}: MilestoneDialogProps) {
  const [label, setLabel] = useState(existing?.label ?? '')
  const [presetUsed, setPresetUsed] = useState(existing?.presetUsed ?? '')
  const [personId, setPersonId] = useState(existing?.personId ?? '')

  const [addOrUpdate, { isLoading: isSaving }] = useAddOrUpdateMilestoneMutation()
  const [remove, { isLoading: isRemoving }] = useRemoveMilestoneMutation()

  // Sync state when existing changes or dialog opens
  useEffect(() => {
    if (open) {
      setLabel(existing?.label ?? '')
      setPresetUsed(existing?.presetUsed ?? '')
      setPersonId(existing?.personId ?? '')
    }
  }, [open, existing])

  const handlePreset = (preset: string) => {
    setLabel(preset)
    setPresetUsed(preset)
  }

  const handleLabelChange = (value: string) => {
    setLabel(value.slice(0, MAX_LABEL))
    // If user edits away from preset, clear presetUsed
    if (presetUsed && value !== presetUsed) setPresetUsed('')
  }

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error('Please enter a milestone label')
      return
    }
    try {
      await addOrUpdate({
        postId,
        label: label.trim(),
        presetUsed: presetUsed || undefined,
        personId: isCoPost ? undefined : personId || undefined,
      }).unwrap()
      toast.success('Milestone saved')
      onSaved?.(label.trim())
      onOpenChange(false)
    } catch {
      toast.error('Failed to save milestone')
    }
  }

  const handleRemove = async () => {
    try {
      await remove(postId).unwrap()
      toast.success('Milestone removed')
      onSaved?.(undefined)
      onOpenChange(false)
    } catch {
      toast.error('Failed to remove milestone')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-amber-500" />
            Mark as Milestone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Preset chips */}
          <div>
            <p className="text-xs text-muted-foreground mb-3">Pick a suggestion or write your own below</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_SUGGESTIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors
                    ${label === preset
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-amber-400 hover:text-foreground'
                    }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Free text */}
          <div className="space-y-1.5">
            <Input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="What made this moment matter?"
              className="text-sm"
              maxLength={MAX_LABEL}
            />
            <p className="text-right text-xs text-muted-foreground">
              {label.length}/{MAX_LABEL}
            </p>
          </div>

          {/* Relationship picker — only for personal posts */}
          {!isCoPost && people.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Link to a relationship (optional)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPersonId('')}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors
                    ${!personId
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50'
                    }`}
                >
                  No link
                </button>
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersonId(p.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors
                      ${personId === p.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50'
                      }`}
                  >
                    {p.alias}
                    {p.relationship && <span className="ml-1 opacity-60">· {p.relationship}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isRemoving || isSaving}
              className="text-destructive hover:text-destructive gap-1 sm:mr-auto"
            >
              {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Remove milestone
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isRemoving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isRemoving || !label.trim()} className="gap-1.5">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
            {existing ? 'Update' : 'Save'} Milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
