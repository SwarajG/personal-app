import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, Plus, Share2, Trash2, X } from 'lucide-react'
import { useSelector } from 'react-redux'
import Layout from '@/features/Layout'
import { useGetCoPostsQuery, useAcceptCoPostMutation, useDeclineCoPostMutation, useDeletePostMutation, useDeleteContributionMutation } from '@/api/postsApi'
import type { Post } from '@/api/postsApi'
import { ContributeDialog } from '@/components/ContributeDialog'
import { MediaGallery } from '@/components/MediaGallery/MediaGallery'
import { PostCard } from '@/components/PostCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { RootState } from '@/store'

export default function CoPosts() {
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const { data: coPosts = [], isLoading } = useGetCoPostsQuery()
  const [acceptCoPost] = useAcceptCoPostMutation()
  const [declineCoPost] = useDeclineCoPostMutation()
  const [deletePost] = useDeletePostMutation()
  const [deleteContribution] = useDeleteContributionMutation()
  const [contributePostId, setContributePostId] = useState<string | null>(null)
  const [contributePostTitle, setContributePostTitle] = useState<string>('')

  const pendingForMe = coPosts.filter(
    (p) => p.coAuthorId === currentUser?.id && !p.coAuthorAccepted
  )
  const pendingSentByMe = coPosts.filter(
    (p) => p.userId === currentUser?.id && !p.coAuthorAccepted
  )
  const accepted = coPosts.filter((p) => p.coAuthorAccepted)

  const getOtherPerson = (post: Post) => {
    if (post.userId === currentUser?.id) return post.coAuthor
    return post.initiatedByUser
  }

  const hasContributed = (post: Post) => {
    const hasMedia = post.media?.some((m) => m.contributedBy === currentUser?.id) ?? false
    const hasNote = post.content.includes('<hr/>')
    return hasMedia || hasNote
  }

  const handleAccept = async (id: string) => {
    try {
      await acceptCoPost(id).unwrap()
      toast.success('Memory accepted!')
    } catch {
      toast.error('Failed to accept. Please try again.')
    }
  }

  const handleDecline = async (id: string) => {
    try {
      await declineCoPost(id).unwrap()
      toast.info("Memory declined. The creator has been notified.")
    } catch {
      toast.error('Failed to decline. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePost(id).unwrap()
      toast.success('Co-post deleted.')
    } catch {
      toast.error('Failed to delete. Please try again.')
    }
  }

  const handleDeleteContribution = async (id: string) => {
    try {
      await deleteContribution(id).unwrap()
      toast.success('Your contribution has been removed.')
    } catch {
      toast.error('Failed to remove contribution. Please try again.')
    }
  }

  const openContribute = (post: Post) => {
    setContributePostId(post.id)
    setContributePostTitle(post.title)
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Share2 className="h-7 w-7" />
            Co-Posts
          </h1>
          <p className="text-muted-foreground mt-2">Shared memories between you and the people you care about</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && pendingForMe.length === 0 && pendingSentByMe.length === 0 && accepted.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Share2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No shared memories yet</p>
            <p className="text-sm mt-1">Share a post with someone from the Dashboard to get started.</p>
          </div>
        )}

        {/* Pending — waiting for my response */}
        {pendingForMe.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Waiting for your response</h2>
            <div className="space-y-4">
              {pendingForMe.map((post) => {
                const other = getOtherPerson(post)
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    lineClamp={3}
                    className="bg-accent/20"
                    subHeader={
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={other?.avatar || ''} />
                          <AvatarFallback className="text-xs">
                            {(other?.name || other?.email || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{other?.name || other?.email} wants to share a memory with you</span>
                      </div>
                    }
                    actions={
                      <div className="flex items-center gap-2">
                        <Button onClick={() => handleAccept(post.id)} className="gap-2" size="sm">
                          <Check className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button variant="outline" onClick={() => handleDecline(post.id)} className="gap-2" size="sm">
                          <X className="h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    }
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* Pending — waiting for the other person to respond */}
        {pendingSentByMe.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Waiting for their response</h2>
            <div className="space-y-4">
              {pendingSentByMe.map((post) => {
                const other = getOtherPerson(post)
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    lineClamp={3}
                    className="bg-muted/30"
                    subHeader={
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={other?.avatar || ''} />
                          <AvatarFallback className="text-xs">
                            {(other?.name || other?.email || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>Waiting for {other?.name || other?.email} to accept</span>
                      </div>
                    }
                    actions={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* Divider */}
        {(pendingForMe.length > 0 || pendingSentByMe.length > 0) && accepted.length > 0 && <div className="border-t" />}

        {/* Accepted shared memories */}
        {accepted.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Shared Memories</h2>
            <div className="space-y-6">
              {accepted.map((post) => {
                const other = getOtherPerson(post)
                const isAuthor = post.userId === currentUser?.id
                const isCoAuthor = post.coAuthorId === currentUser?.id
                const alreadyContributed = hasContributed(post)
                const originalMedia = post.media?.filter((m) => !m.contributedBy) ?? []
                const contributedMedia = post.media?.filter((m) => m.contributedBy) ?? []

                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    subHeader={
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Share2 className="h-3 w-3 flex-shrink-0" />
                        <span>
                          {post.initiatedByUser?.name || post.initiatedByUser?.email || 'You'} &amp; {post.coAuthor?.name || post.coAuthor?.email}
                        </span>
                      </div>
                    }
                    mediaSlot={
                      originalMedia.length > 0 || contributedMedia.length > 0 || alreadyContributed ? (
                        <div className="space-y-3 pt-1">
                          {originalMedia.length > 0 && <MediaGallery media={originalMedia} />}
                          {(contributedMedia.length > 0 || (isCoAuthor && alreadyContributed)) && (
                            <div className="rounded-md border border-dashed p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground">
                                  Added by {isCoAuthor ? 'you' : (other?.name || other?.email)}
                                </p>
                                {isCoAuthor && alreadyContributed && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteContribution(post.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                              {contributedMedia.length > 0 && <MediaGallery media={contributedMedia} />}
                            </div>
                          )}
                        </div>
                      ) : null
                    }
                    actions={
                      <div className="flex items-center gap-2">
                        {isCoAuthor && !alreadyContributed && (
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openContribute(post)}>
                            <Plus className="h-3.5 w-3.5" />
                            Add contribution
                          </Button>
                        )}
                        {isAuthor && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    }
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* Contribute Dialog */}
        {contributePostId && (
          <ContributeDialog
            postId={contributePostId}
            postTitle={contributePostTitle}
            open={!!contributePostId}
            onOpenChange={(open) => {
              if (!open) {
                setContributePostId(null)
                setContributePostTitle('')
              }
            }}
          />
        )}
      </div>
    </Layout>
  )
}
