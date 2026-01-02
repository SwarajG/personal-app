import { useRef, useState } from 'react'
import { toast } from 'sonner'
import Layout from '../Layout'
import type { RichTextEditorRef } from '@/components/RichTextEditor'
import RichTextEditor from '@/components/RichTextEditor'
import { Button } from '@/components/ui/button'
import { useCreatePostMutation } from '@/api/postsApi'

export default function Dashboard() {
  const [content, setContent] = useState('')
  const editorRef = useRef<RichTextEditorRef>(null)
  const [createPost, { isLoading }] = useCreatePostMutation()

  const handleSubmit = async () => {
    if (!content.trim() || content === '<p><br></p>') {
      toast.error('Please write something before submitting')
      return
    }

    try {
      const result = await createPost({
        content,
        timestamp: new Date().toISOString(),
      }).unwrap()

      if (result.success) {
        toast.success(result.message || 'Post saved successfully!')
        editorRef.current?.clear()
        setContent('')
      } else {
        toast.error(result.message || 'Failed to save post')
      }
    } catch (error) {
      toast.error('An error occurred while saving the post')
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Write a Post</h1>
          <p className="text-muted-foreground mt-2">
            Share your thoughts and experiences
          </p>
        </div>

        <div className="space-y-4">
          <RichTextEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            placeholder="Write your post here..."
            minHeight="120px"
            className="shadow-sm"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              size="lg"
              className="min-w-[120px]"
            >
              {isLoading ? 'Submitting...' : 'Submit Post'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}