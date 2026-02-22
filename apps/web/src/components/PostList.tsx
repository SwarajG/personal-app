import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useDeletePostMutation } from '../api/postsApi'
import type { Post } from '../api/postsApi'
import { Button } from './ui/button'
import { PostCard } from './PostCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

interface PostListProps {
  posts: Array<Post>
  selectedDate: Date
  isLoading?: boolean
  isError?: boolean
}

export default function PostList({ posts, selectedDate, isLoading, isError }: PostListProps) {
  const formattedDate = format(selectedDate, 'MMMM d, yyyy')
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation()
  const [postToDelete, setPostToDelete] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!postToDelete) return
    try {
      await deletePost(postToDelete).unwrap()
      toast.success('Post deleted successfully')
      setPostToDelete(null)
    } catch {
      toast.error('Failed to delete post. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading posts...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-destructive">Failed to load posts. Please try again.</div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground text-lg">
          No posts on <span className="font-semibold">{formattedDate}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Posts for {formattedDate}</h2>

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            actions={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setPostToDelete(post.id)}
                title="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        ))}
      </div>

      <Dialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
