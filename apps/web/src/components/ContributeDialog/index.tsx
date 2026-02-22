import { useState } from 'react'
import { toast } from 'sonner'
import { useContributeToCoPostMutation } from '@/api/postsApi'
import { MediaUpload } from '@/components/MediaUpload'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UploadedMedia } from '@/api/mediaApi'

interface ContributeDialogProps {
  postId: string
  postTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContributeDialog({ postId, postTitle, open, onOpenChange }: ContributeDialogProps) {
  const [note, setNote] = useState('')
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const [contributeToCoPost, { isLoading }] = useContributeToCoPostMutation()

  const handleSubmit = async () => {
    if (!note.trim() && uploadedMedia.length === 0) {
      toast.error('Please add a note or at least one photo')
      return
    }

    try {
      await contributeToCoPost({
        id: postId,
        note: note.trim() || undefined,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
      }).unwrap()

      toast.success('Your contribution was added!')
      setNote('')
      setUploadedMedia([])
      onOpenChange(false)
    } catch {
      toast.error('Failed to add contribution. Please try again.')
    }
  }

  const handleClose = () => {
    setNote('')
    setUploadedMedia([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Your Contribution</DialogTitle>
          <DialogDescription>
            Add your own photos or a note to "{postTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your note</label>
            <textarea
              className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Write something to add to this memory..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your photos</label>
            <MediaUpload
              onMediaUploaded={setUploadedMedia}
              existingMedia={uploadedMedia}
              maxFiles={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Contribution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
