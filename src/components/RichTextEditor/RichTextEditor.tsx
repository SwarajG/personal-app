import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import Quill from 'quill'
import "quill/dist/quill.core.css";
import 'quill/dist/quill.snow.css'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
  theme?: 'snow' | 'bubble'
  modules?: Record<string, any>
  formats?: Array<string>
  minHeight?: string
}

export interface RichTextEditorRef {
  getEditor: () => Quill | null
  getContent: () => string
  setContent: (content: string) => void
  clear: () => void
  focus: () => void
}

const defaultModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
}

const defaultFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'color',
  'background',
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
]

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      value = '',
      onChange,
      placeholder = 'Write something...',
      className,
      readOnly = false,
      theme = 'snow',
      modules = defaultModules,
      formats = defaultFormats,
      minHeight = '200px',
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const quillRef = useRef<Quill | null>(null)
    const isUpdatingRef = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      getEditor: () => quillRef.current,
      getContent: () => quillRef.current?.root.innerHTML || '',
      setContent: (content: string) => {
        if (quillRef.current) {
          quillRef.current.root.innerHTML = content
        }
      },
      clear: () => {
        if (quillRef.current) {
          quillRef.current.setText('')
        }
      },
      focus: () => {
        if (quillRef.current) {
          quillRef.current.focus()
        }
      },
    }))

    useEffect(() => {
      if (!containerRef.current) return
      
      // Skip if already initialized
      if (quillRef.current) return

      // Clear any existing content
      containerRef.current.innerHTML = ''

      // Create a new div for Quill each time
      const editorElement = document.createElement('div')
      editorElement.style.minHeight = minHeight
      containerRef.current.appendChild(editorElement)

      // Create Quill editor
      const quill = new Quill(editorElement, {
        theme,
        readOnly,
        placeholder,
        modules,
        formats,
      })

      quillRef.current = quill
      editorRef.current = editorElement

      // Set initial value
      if (value) {
        quill.root.innerHTML = value
      }

      // Handle text change
      quill.on('text-change', () => {
        if (!isUpdatingRef.current && onChange) {
          onChange(quill.root.innerHTML)
        }
      })

      return () => {
        // Cleanup Quill instance
        quillRef.current = null
        editorRef.current = null
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
      }
    }, [])

    // Update content when value prop changes
    useEffect(() => {
      if (quillRef.current && value !== quillRef.current.root.innerHTML) {
        isUpdatingRef.current = true
        quillRef.current.root.innerHTML = value
        isUpdatingRef.current = false
      }
    }, [value])

    // Update readOnly state
    useEffect(() => {
      if (quillRef.current) {
        quillRef.current.enable(!readOnly)
      }
    }, [readOnly])

    return (
      <div
        className={cn(
          'rich-text-editor rounded-md border bg-background',
          className
        )}
      >
        <div ref={containerRef} className="quill-editor" />
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor
