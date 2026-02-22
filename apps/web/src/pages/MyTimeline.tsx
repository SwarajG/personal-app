import { format } from 'date-fns'
import { Flag, Sparkles } from 'lucide-react'
import { useGetMyMilestonesQuery } from '@/api/milestoneApi'
import type { Milestone } from '@/api/milestoneApi'

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const thumb = milestone.post?.media?.[0]

  return (
    <div className="flex gap-4 items-start p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
      {thumb?.fileUrl ? (
        <img
          src={thumb.fileUrl}
          alt=""
          className="h-16 w-16 rounded-md object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-16 w-16 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Flag className="h-6 w-6 text-amber-500" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Flag className="h-3 w-3 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
            {milestone.label}
          </span>
        </div>
        <p className="text-sm font-semibold truncate">{milestone.post?.title}</p>
        {milestone.post?.date && (
          <time className="text-xs text-muted-foreground">
            {format(new Date(milestone.post.date), 'MMMM d, yyyy')}
          </time>
        )}
        {milestone.person && (
          <p className="text-xs text-muted-foreground mt-0.5">
            with {milestone.person.alias}
            {milestone.person.relationship && ` · ${milestone.person.relationship}`}
          </p>
        )}
      </div>
    </div>
  )
}

export default function MyTimeline() {
  const { data: milestones = [], isLoading } = useGetMyMilestonesQuery()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Milestones</h1>
        <p className="text-muted-foreground mt-2">
          The moments that mattered most — a birds-eye view of your most significant memories.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && milestones.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground/40" />
          <div>
            <p className="text-lg font-medium">No milestones yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tag a post as a milestone moment and it will appear here.
            </p>
          </div>
        </div>
      )}

      {!isLoading && milestones.length > 0 && (
        <div className="space-y-3">
          {milestones.map((m: Milestone) => (
            <MilestoneCard key={m.id} milestone={m} />
          ))}
        </div>
      )}
    </div>
  )
}
