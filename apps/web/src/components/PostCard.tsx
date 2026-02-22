import { format } from 'date-fns'
import { Share2, Flag } from 'lucide-react'
import { MediaGallery } from './MediaGallery'
import type { Post } from '@/api/postsApi'

interface PostCardProps {
  post: Post
  /** Buttons / controls rendered in the top-right corner */
  actions?: React.ReactNode
  /** Optional label/badge rendered below the title (e.g. "Waiting for X to accept") */
  subHeader?: React.ReactNode
  /** Override the default MediaGallery rendering (e.g. for split contributor media) */
  mediaSlot?: React.ReactNode
  /** Clamp content to N lines for list views; omit for full view */
  lineClamp?: 3 | 4
  className?: string
}

export function PostCard({ post, actions, subHeader, mediaSlot, lineClamp, className = '' }: PostCardProps) {
  const clampClass = lineClamp === 3 ? 'line-clamp-3' : lineClamp === 4 ? 'line-clamp-4' : ''

  return (
    <article className={`rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold">{post.title}</h3>
            <time className="text-xs text-muted-foreground">
              {format(new Date(post.date), 'MMMM d, yyyy')}
            </time>

            {post.isCoPost && post.coAuthor && !subHeader && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Share2 className="h-3 w-3 flex-shrink-0" />
                <span>
                  {post.initiatedByUser?.name ?? post.initiatedByUser?.email ?? 'You'} &amp; {post.coAuthor.name ?? post.coAuthor.email}
                </span>
                {!post.coAuthorAccepted && (
                  <span className="ml-1 rounded-full border px-1.5 py-0.5 text-[10px]">
                    Pending
                  </span>
                )}
              </div>
            )}

            {subHeader && <div className="mt-1">{subHeader}</div>}
          </div>

          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
          )}
        </div>

        {/* Rich-text content — quill-content class neutralises inline bg styles in dark mode */}
        <div
          className={`quill-content prose prose-sm dark:prose-invert max-w-none ${clampClass}`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Media — caller can override with mediaSlot for custom layouts */}
        {mediaSlot !== undefined
          ? mediaSlot
          : post.media && post.media.length > 0 && (
              <div className="pt-1">
                <MediaGallery media={post.media} />
              </div>
            )}

        {/* Milestone indicator */}
        {post.milestone && (
          <div className="flex items-center gap-1.5 pt-1">
            <Flag className="h-3 w-3 flex-shrink-0 text-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-light">
              {post.milestone.label}
            </span>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {post.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
