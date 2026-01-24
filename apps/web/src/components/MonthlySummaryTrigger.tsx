import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useTriggerMonthlySummaryMutation } from '@/api/postsApi'

export default function MonthlySummaryTrigger() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [triggerSummary, { isLoading }] = useTriggerMonthlySummaryMutation()

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

  const handleTrigger = async () => {
    try {
      // TODO: Replace with actual user ID from auth context
      const userId = 'user123'
      
      const result = await triggerSummary({
        userId,
        month: selectedMonth,
        year: selectedYear,
      }).unwrap()

      toast.success('Monthly summary generation started! This may take a few moments.')
      setIsOpen(false)
    } catch (error) {
      console.error('Error triggering monthly summary:', error)
      toast.error('Failed to trigger monthly summary generation.')
    }
  }

  const monthName = months.find(m => m.value === selectedMonth)?.label
  const monthLabel = `${monthName} ${selectedYear}`

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Generate Monthly Summary
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Monthly Summary</DialogTitle>
          <DialogDescription>
            Select a month and year to generate an AI-powered summary of all your posts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="month" className="text-sm font-medium leading-none">
                Month
              </label>
              <Select
                id="month"
                value={selectedMonth.toString()}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="year" className="text-sm font-medium leading-none">
                Year
              </label>
              <Select
                id="year"
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Selected Period: {monthLabel}</p>
            <p className="text-muted-foreground mt-1">
              This will analyze all posts from this month and create a comprehensive summary.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleTrigger} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Summary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
