import { useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import Layout from '../Layout'
import type { PostComposerRef } from '@/components/PostComposer'
import PostList from '@/components/PostList'
import PostComposer from '@/components/PostComposer'
import { MediaUpload } from '@/components/MediaUpload'
import { CoAuthorPicker } from '@/components/CoAuthorPicker'
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
import { useCreatePostMutation, useGenerateTitleMutation, useGetPostsByDateQuery } from '@/api/postsApi'
import { useAddOrUpdateMilestoneMutation } from '@/api/milestoneApi'
import { useGetPeopleQuery } from '@/api/peopleApi'
import type { UploadedMedia } from '@/api/mediaApi'
import type { Person } from '@/api/peopleApi'

// ── Milestone staging form (used before post is created) ──────────────────────

const MILESTONE_PRESETS = [
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

interface StagedMilestone {
  label: string
  presetUsed?: string
  personId?: string
}

function MilestoneStagingForm({
  isCoPost,
  people,
  initial,
  onSave,
  onCancel,
}: {
  isCoPost: boolean
  people: Person[]
  initial: StagedMilestone | null
  onSave: (m: StagedMilestone) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [presetUsed, setPresetUsed] = useState(initial?.presetUsed ?? '')
  const [personId, setPersonId] = useState(initial?.personId ?? '')

  const handlePreset = (preset: string) => { setLabel(preset); setPresetUsed(preset) }
  const handleLabelChange = (v: string) => {
    setLabel(v.slice(0, 60))
    if (presetUsed && v !== presetUsed) setPresetUsed('')
  }

  return (
    <>
      <div className="space-y-5 py-2">
        <div>
          <p className="text-xs text-muted-foreground mb-3">Pick a suggestion or write your own below</p>
          <div className="flex flex-wrap gap-2">
            {MILESTONE_PRESETS.map((preset) => (
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
        <div className="space-y-1.5">
          <Input
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="What made this moment matter?"
            className="text-sm"
          />
          <p className="text-right text-xs text-muted-foreground">{label.length}/60</p>
        </div>
        {!isCoPost && people.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Link to a relationship (optional)</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPersonId('')}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors
                  ${!personId ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50'}`}
              >
                No link
              </button>
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonId(p.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors
                    ${personId === p.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/50'}`}
                >
                  {p.alias}{p.relationship && <span className="ml-1 opacity-60">· {p.relationship}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={() => onSave({ label: label.trim(), presetUsed: presetUsed || undefined, personId: isCoPost ? undefined : personId || undefined })}
          disabled={!label.trim()}
          className="gap-1.5"
        >
          <Flag className="h-3.5 w-3.5" />
          Save Milestone
        </Button>
      </DialogFooter>
    </>
  )
}

interface SelectedPerson {
  id: string
  addedUserId: string
  alias: string
  addedUser: { id: string; email: string; name?: string; avatar?: string }
}

/** Convert plain textarea text to simple HTML for storage/display. */
function textToHtml(text: string): string {
  if (!text.trim()) return ''
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export default function Dashboard() {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [currentSelectedDate, setCurrentSelectedDate] = useState<Date | null>(null)
  const [selectedCoAuthor, setSelectedCoAuthor] = useState<SelectedPerson | null>(null)
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
  const [pendingMilestone, setPendingMilestone] = useState<{ label: string; presetUsed?: string; personId?: string } | null>(null)
  const editorRef = useRef<PostComposerRef>(null)
  const [createPost, { isLoading }] = useCreatePostMutation()
  const [generateTitle] = useGenerateTitleMutation()
  const [addOrUpdateMilestone] = useAddOrUpdateMilestoneMutation()
  const { data: people } = useGetPeopleQuery()

  const onModalClose = () => {
    setIsModalOpen(false)
    setTitle('')
    setPendingMilestone(null)
  }

  const handleMediaUploaded = (media: UploadedMedia[]) => {
    setUploadedMedia(media)
  }

  const handleInitialSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please write something before submitting')
      return
    }

    setIsGeneratingTitle(true)
    setIsModalOpen(true)

    try {
      const result = await generateTitle({ content }).unwrap()
      setTitle(result.title)
    } catch (error) {
      console.error('Error generating title:', error)
      toast.error('Could not generate title. Please enter one manually.')
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  const handleFinalSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    try {
      const postDate = currentSelectedDate || new Date()
      const result = await createPost({
        content: textToHtml(content),
        title,
        date: postDate.toISOString(),
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
        coAuthorId: selectedCoAuthor?.addedUserId,
      }).unwrap()

      if (result.success) {
        // Save milestone if one was staged
        if (pendingMilestone && result.id) {
          try {
            await addOrUpdateMilestone({
              postId: result.id,
              label: pendingMilestone.label,
              presetUsed: pendingMilestone.presetUsed,
              personId: pendingMilestone.personId,
            }).unwrap()
          } catch {
            toast.error('Post saved but milestone could not be attached')
          }
        }

        if (selectedCoAuthor) {
          toast.success(`Memory shared! ${selectedCoAuthor.alias} will be notified to accept.`)
        } else {
          toast.success(result.message || 'Post saved successfully!')
        }
        editorRef.current?.clear()
        setContent('')
        setTitle('')
        setUploadedMedia([])
        setSelectedCoAuthor(null)
        setPendingMilestone(null)
        setIsModalOpen(false)
      } else {
        toast.error(result.message || 'Failed to save post')
      }
    } catch (error) {
      toast.error('An error occurred while saving the post')
    }
  }

  const acceptedPeople = people?.accepted ?? []

  return (
    <Layout>
      {(selectedDate) => {
        // Clear editor when date changes
        useEffect(() => {
          if (selectedDate?.getTime() !== currentSelectedDate?.getTime()) {
            editorRef.current?.clear()
            setContent('')
            setTitle('')
            setUploadedMedia([])
            setSelectedCoAuthor(null)
            setCurrentSelectedDate(selectedDate)
          }
        }, [selectedDate])

        // Format date for display
        const formatDisplayDate = (date: Date) => {
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        }

        // Format date for API call (YYYY-MM-DD) using local date to avoid timezone issues
        const formatDateString = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        
        const dateString = selectedDate 
          ? formatDateString(selectedDate)
          : formatDateString(new Date())
        
        const displayDate = selectedDate 
          ? formatDisplayDate(selectedDate)
          : formatDisplayDate(new Date())
        
        const { data: posts = [], isLoading: isLoadingPosts, isError } = useGetPostsByDateQuery(dateString)
        
        return (
          <div className="mx-auto max-w-4xl space-y-8">

            {/* Create New Post Section */}
            <div>
              <div className="mb-6">
                <h1 className="text-3xl font-bold">Write a Post for {displayDate}</h1>
                <p className="text-muted-foreground mt-2">
                  Share your thoughts and experiences
                </p>
              </div>

              <div className="space-y-4">
                <PostComposer
                  ref={editorRef}
                  value={content}
                  onChange={setContent}
                  placeholder="Write your post here..."
                  minHeight="120px"
                  className="shadow-sm"
                />

                <MediaUpload
                  onMediaUploaded={handleMediaUploaded}
                  existingMedia={uploadedMedia}
                  maxFiles={10}
                />

                <CoAuthorPicker
                  selected={selectedCoAuthor}
                  onSelect={setSelectedCoAuthor}
                />

                <div className="flex justify-end">
                  <Button
                    onClick={handleInitialSubmit}
                    disabled={isLoading || isGeneratingTitle}
                    size="lg"
                    className="min-w-[120px]"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Post'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Post List Section */}
            <PostList 
              posts={posts} 
              selectedDate={selectedDate || new Date()} 
              isLoading={isLoadingPosts}
              isError={isError}
            />

            {/* Milestone staging dialog (no postId yet — stores locally until publish) */}
            <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-amber-500" />
                    Mark as Milestone
                  </DialogTitle>
                </DialogHeader>
                <MilestoneStagingForm
                  isCoPost={!!selectedCoAuthor}
                  people={acceptedPeople}
                  initial={pendingMilestone}
                  onSave={(m) => { setPendingMilestone(m); setIsMilestoneDialogOpen(false) }}
                  onCancel={() => setIsMilestoneDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Finalize Your Post</DialogTitle>
                  <DialogDescription>
                    {isGeneratingTitle 
                      ? 'AI is generating a title for you...' 
                      : 'Review or edit the AI-generated title before publishing.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium leading-none">
                      Title
                    </label>
                    <Input
                      id="title"
                      placeholder={isGeneratingTitle ? 'Generating title...' : 'Enter post title...'}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isGeneratingTitle}
                    />
                  </div>
                  {selectedCoAuthor && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent rounded-md px-3 py-2">
                      <span>Sharing with:</span>
                      <span className="font-medium text-foreground">{selectedCoAuthor.alias}</span>
                    </div>
                  )}
                  {/* Milestone option */}
                  <div className="border-t pt-3">
                    {pendingMilestone ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Flag className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-amber-600 dark:text-amber-400 flex-1 truncate">
                          {pendingMilestone.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsMilestoneDialogOpen(true)}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingMilestone(null)}
                          className="text-xs text-muted-foreground hover:text-destructive underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsMilestoneDialogOpen(true)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Mark as milestone moment
                      </button>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={onModalClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleFinalSubmit} disabled={isLoading}>
                    {isLoading ? 'Publishing...' : 'Publish Post'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )
      }}
    </Layout>
  )
}