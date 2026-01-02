import { useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface CalendarViewProps {
  onDateSelect?: (date: Date | undefined) => void
  selectedDate?: Date
  className?: string
  header?: string
  showHeader?: boolean
}

export default function CalendarView({
  onDateSelect,
  selectedDate,
  className,
  header,
  showHeader = false,
}: CalendarViewProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date())

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate)
    if (onDateSelect) {
      onDateSelect(newDate)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {showHeader && (
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">{header}</h2>
        </div>
      )}
      <div className="p-4 flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateChange}
          className="rounded-md border"
        />
      </div>
    </div>
  )
}
