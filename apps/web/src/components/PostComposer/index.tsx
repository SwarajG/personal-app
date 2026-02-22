import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import EmojiPicker from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'
import { Theme as EmojiTheme } from 'emoji-picker-react'
import { Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/ThemeProvider'

interface PostComposerProps {
  value?: string
  onChange?: (text: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export interface PostComposerRef {
  getContent: () => string
  setContent: (text: string) => void
  clear: () => void
  focus: () => void
}

const PICKER_HEIGHT = 450
const PICKER_WIDTH = 350
const EDGE_PADDING = 8

const PostComposer = forwardRef<PostComposerRef, PostComposerProps>(
  (
    {
      value = '',
      onChange,
      placeholder = 'Write something...',
      className,
      minHeight = '120px',
    },
    ref
  ) => {
    const { theme } = useTheme()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [showPicker, setShowPicker] = useState(false)
    const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({})

    useImperativeHandle(ref, () => ({
      getContent: () => textareaRef.current?.value ?? '',
      setContent: (text: string) => { onChange?.(text) },
      clear: () => { onChange?.('') },
      focus: () => { textareaRef.current?.focus() },
    }))

    const handleTogglePicker = () => {
      if (!showPicker && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight

        const pickerW = Math.min(PICKER_WIDTH, vw - EDGE_PADDING * 2)

        // Horizontal: right-align to button, clamp within viewport
        let left = rect.right - pickerW
        if (left < EDGE_PADDING) left = EDGE_PADDING
        if (left + pickerW > vw - EDGE_PADDING) left = vw - pickerW - EDGE_PADDING

        // Vertical: prefer above button; fall back to below if not enough room
        const spaceAbove = rect.top
        const spaceBelow = vh - rect.bottom
        const style: React.CSSProperties = { position: 'fixed', width: pickerW, zIndex: 9999, left }

        if (spaceAbove >= PICKER_HEIGHT || spaceAbove > spaceBelow) {
          // Show above
          style.bottom = vh - rect.top + EDGE_PADDING
          // Clamp so it doesn't go above the viewport
          const wouldTop = vh - (style.bottom as number) - PICKER_HEIGHT
          if (wouldTop < EDGE_PADDING) {
            style.bottom = vh - EDGE_PADDING - PICKER_HEIGHT
          }
        } else {
          // Show below
          style.top = rect.bottom + EDGE_PADDING
        }

        setPickerStyle(style)
      }
      setShowPicker((v) => !v)
    }

    const handleEmojiClick = (emojiData: EmojiClickData) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart ?? value.length
      const end = textarea.selectionEnd ?? value.length
      const newValue = value.slice(0, start) + emojiData.emoji + value.slice(end)
      onChange?.(newValue)

      const newCursor = start + emojiData.emoji.length
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(newCursor, newCursor)
      }, 0)

      setShowPicker(false)
    }

    return (
      <div className={cn('relative', className)}>
        {/* Editor card */}
        <div className="rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full resize-none bg-transparent px-3 pt-3 pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          {/* Toolbar row */}
          <div className="flex items-center justify-end border-t px-2 py-1">
            <Button
              ref={buttonRef}
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleTogglePicker}
              aria-label="Insert emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Emoji picker — rendered in a portal-like fixed overlay */}
        {showPicker && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowPicker(false)} />
            <div style={pickerStyle}>
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                width="100%"
                height={PICKER_HEIGHT}
                lazyLoadEmojis
              />
            </div>
          </>
        )}
      </div>
    )
  }
)

PostComposer.displayName = 'PostComposer'

export default PostComposer
