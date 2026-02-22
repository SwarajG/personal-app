import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Loader2, FileText, Trash2, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { useGetPaginatedPostsQuery, useDeletePostMutation } from '@/api/postsApi'
import type { Post } from '@/api/postsApi'
import { PostCard } from '@/components/PostCard'
import { MilestoneDialog } from '@/components/MilestoneDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useGetPeopleQuery } from '@/api/peopleApi'
import type { RootState } from '@/store'

const LIMIT = 10

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-6 w-2/3 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-4/6 rounded bg-muted" />
      </div>
      <div className="h-3 w-24 rounded bg-muted" />
    </div>
  )
}

function PostSkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  )
}

// ── Bottom loader shown while fetching next page ───────────────────────────────

function BottomLoader() {
  return (
    <div className="flex justify-center py-6">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AllPosts() {
  const [page, setPage] = useState(1)
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [milestonePost, setMilestonePost] = useState<Post | null>(null)

  const currentUserId = useSelector((state: RootState) => state.auth.user?.id)

  const { data, isLoading, isFetching } = useGetPaginatedPostsQuery({ page, limit: LIMIT })
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation()
  const { data: people } = useGetPeopleQuery()

  useEffect(() => {
    if (!data) return
    setAllPosts(prev => page === 1 ? data.posts : [...prev, ...data.posts])
    setHasMore(data.hasMore)
  }, [data, page])

  const fetchNextPage = () => {
    if (!isFetching && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  const handleDelete = async () => {
    if (!postToDelete) return
    try {
      await deletePost(postToDelete).unwrap()
      toast.success('Post deleted')
      setAllPosts(prev => prev.filter(p => p.id !== postToDelete))
      setPostToDelete(null)
    } catch {
      toast.error('Failed to delete post. Please try again.')
    }
  }

  const handleMilestoneSaved = (postId: string, label?: string) => {
    setAllPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      if (!label) return { ...p, milestone: undefined }
      return { ...p, milestone: { ...p.milestone, id: p.milestone?.id ?? '', postId, label, createdBy: '', createdAt: '' } }
    }))
    setMilestonePost(null)
  }

  const acceptedPeople = people?.accepted ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold">All Posts</h1>
        <p className="text-muted-foreground mt-1">A complete history of your diary entries.</p>
      </div>

      {/* Initial skeleton */}
      {isLoading && page === 1 && <PostSkeletonList />}

      {/* Empty state */}
      {!isLoading && allPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/50" />
          <div>
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start writing on the Dashboard to see your entries here.
            </p>
          </div>
        </div>
      )}

      {/* Infinite scroll list */}
      {allPosts.length > 0 && (
        <InfiniteScroll
          dataLength={allPosts.length}
          next={fetchNextPage}
          hasMore={hasMore}
          loader={<BottomLoader />}
          endMessage={
            <p className="text-center text-sm text-muted-foreground py-8">
              You've reached the end · {allPosts.length} post{allPosts.length !== 1 ? 's' : ''} total
            </p>
          }
          className="space-y-4 !overflow-visible"
        >
          {allPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              lineClamp={4}
              actions={
                <>
                  {post.userId === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 shrink-0 ${post.milestone ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
                      onClick={() => setMilestonePost(post)}
                      title={post.milestone ? 'Edit milestone' : 'Mark as milestone'}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setPostToDelete(post.id)}
                    title="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              }
            />
          ))}
        </InfiniteScroll>
      )}

      {/* Delete confirmation dialog */}
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
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone dialog */}
      {milestonePost && (
        <MilestoneDialog
          open={!!milestonePost}
          onOpenChange={(open) => { if (!open) setMilestonePost(null) }}
          postId={milestonePost.id}
          isCoPost={milestonePost.isCoPost}
          coAuthorId={milestonePost.coAuthorId}
          existing={milestonePost.milestone}
          people={acceptedPeople}
          onSaved={(label) => handleMilestoneSaved(milestonePost.id, label)}
        />
      )}
    </div>
  )
}
