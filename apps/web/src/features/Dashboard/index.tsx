import { useRef, useState } from 'react'
import { toast } from 'sonner'
import Layout from '../Layout'
import type { RichTextEditorRef } from '@/components/RichTextEditor'
import RichTextEditor from '@/components/RichTextEditor'
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
import { useCreatePostMutation, useGenerateTitleMutation } from '@/api/postsApi'

export default function Dashboard() {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const editorRef = useRef<RichTextEditorRef>(null)
  const [createPost, { isLoading }] = useCreatePostMutation()
  const [generateTitle] = useGenerateTitleMutation()

  const handleInitialSubmit = async () => {
    if (!content.trim() || content === '<p><br></p>') {
      toast.error('Please write something before submitting')
      return
    }

    setIsGeneratingTitle(true)
    setIsModalOpen(true)

    try {
      const result = await generateTitle({ content }).unwrap()
      setTitle(result.title)
      toast.success('AI generated a title suggestion!')
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
      const result = await createPost({
        content,
        title,
        date: new Date().toISOString(),
      }).unwrap()

      if (result.success) {
        toast.success(result.message || 'Post saved successfully!')
        editorRef.current?.clear()
        setContent('')
        setTitle('')
        setIsModalOpen(false)
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
          <h1 className="text-3xl font-bold">Write a Post for Today</h1>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalSubmit} disabled={isLoading}>
              {isLoading ? 'Publishing...' : 'Publish Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}