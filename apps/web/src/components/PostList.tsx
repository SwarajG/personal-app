import { format } from 'date-fns'

interface Post {
  id: string
  title: string
  content: string
  date: string
  mood?: string
  tags: Array<string>
  createdAt: string
  updatedAt: string
}

interface PostListProps {
  posts: Array<Post>
  selectedDate: Date
  isLoading?: boolean
  isError?: boolean
}

export default function PostList({ posts, selectedDate, isLoading, isError }: PostListProps) {
  const formattedDate = format(selectedDate, 'MMMM d, yyyy')

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
      <h2 className="text-2xl font-bold">
        Posts for {formattedDate}
      </h2>
      
      <div className="space-y-4">
        {posts.map((post) => (
          <article
            key={post.id}
            className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-semibold">{post.title}</h3>
                <time className="text-sm text-muted-foreground">
                  {format(new Date(post.createdAt), 'h:mm a')}
                </time>
              </div>
              
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
              
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
