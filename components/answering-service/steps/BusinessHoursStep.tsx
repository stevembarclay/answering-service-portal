'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { FormDescription } from '@/components/ui/form-description'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

// Generate time options in 15-minute intervals (12:00 AM to 11:45 PM)
function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const displayMinute = minute.toString().padStart(2, '0')
      times.push(`${displayHour}:${displayMinute} ${period}`)
    }
  }
  return times
}

const TIME_OPTIONS = generateTimeOptions()

export function BusinessHoursStep() {
  const { watch, setValue, formState: { errors } } = useFormContext<AnsweringServiceSetup>()
  const hoursType = watch('businessHours.type')
  const customHours = watch('businessHours.customHours') || []

  // Initialize customHours if not present
  const ensureCustomHours = () => {
    if (!customHours || customHours.length === 0) {
      const initialHours = DAYS_OF_WEEK.map(day => ({
        day: day.value,
        open: '9:00 AM',
        close: '5:00 PM',
        closed: false,
      }))
      setValue('businessHours.customHours', initialHours)
    }
  }

  // When switching to custom, initialize hours
  const handleTypeChange = (value: string) => {
    setValue('businessHours.type', value as 'standard' | 'custom' | '24_7')
    if (value === 'custom') {
      ensureCustomHours()
    }
  }

  const updateDayHours = (dayValue: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    const currentHours = customHours.length > 0 ? [...customHours] : DAYS_OF_WEEK.map(day => ({
      day: day.value,
      open: '9:00 AM',
      close: '5:00 PM',
      closed: false,
    }))

    const dayIndex = currentHours.findIndex(h => h.day === dayValue)
    if (dayIndex >= 0) {
      currentHours[dayIndex] = {
        ...currentHours[dayIndex],
        [field]: value,
      }
    } else {
      currentHours.push({
        day: dayValue,
        open: field === 'open' ? (value as string) : '9:00 AM',
        close: field === 'close' ? (value as string) : '5:00 PM',
        closed: field === 'closed' ? (value as boolean) : false,
      })
    }

    setValue('businessHours.customHours', currentHours)
  }

  const getDayHours = (dayValue: string) => {
    const day = customHours.find(h => h.day === dayValue)
    if (day) {
      return day
    }
    return { day: dayValue, open: '9:00 AM', close: '5:00 PM', closed: false }
  }

  return (
    <div className="space-y-6">
      <FormDescription>
        Set your business hours so Answering Service knows when to route calls differently. Calls during business hours can be handled differently than after-hours calls—you'll configure this behavior when setting up call types. The timezone you select ensures calls are routed correctly based on your local time.
      </FormDescription>

      <div className="space-y-3">
        <Label>When is your business open?</Label>
        <FormDescription>
          <strong>24/7 Coverage:</strong> Calls are handled the same way all day, every day. <strong>Set Business Hours:</strong> Define specific hours per day—calls outside these hours follow your after-hours handling rules (configured in call types). For example, if you close weekends, those days will use after-hours handling.
        </FormDescription>
        <RadioGroup
          value={hoursType}
          onValueChange={handleTypeChange}
          className="space-y-2"
          aria-invalid={errors.businessHours?.type ? 'true' : 'false'}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="24_7" id="24_7" />
            <Label htmlFor="24_7" className="font-normal">
              24/7 Coverage
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="font-normal">
              Set Business Hours
            </Label>
          </div>
        </RadioGroup>
        {errors.businessHours?.type && (
          <p className="text-sm text-destructive">
            {errors.businessHours.type.message}
          </p>
        )}
      </div>

      {hoursType === 'custom' && (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Day</th>
                  <th className="text-left p-3 text-sm font-medium">Open</th>
                  <th className="text-left p-3 text-sm font-medium">Close</th>
                  <th className="text-center p-3 text-sm font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.map((day) => {
                  const dayHours = getDayHours(day.value)
                  return (
                    <tr key={day.value} className="border-t border-input">
                      <td className="p-3 text-sm">{day.label}</td>
                      <td className="p-3">
                        {dayHours.closed ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Select
                            value={dayHours.open}
                            onValueChange={(val: string) => updateDayHours(day.value, 'open', val)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-3">
                        {dayHours.closed ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Select
                            value={dayHours.close}
                            onValueChange={(val: string) => updateDayHours(day.value, 'close', val)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Checkbox
                          checked={dayHours.closed}
                          onCheckedChange={(checked) => {
                            updateDayHours(day.value, 'closed', checked === true)
                            if (!checked) {
                              // When opening, set default times if not already set
                              const current = getDayHours(day.value)
                              if (!current.open || !current.close) {
                                updateDayHours(day.value, 'open', '9:00 AM')
                                updateDayHours(day.value, 'close', '5:00 PM')
                              }
                            }
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Timezone</Label>
        <FormDescription>
          Select your business timezone. This is critical for routing—Answering Service uses this to determine if a call arrives during business hours or after hours. Make sure this matches your actual location, not where your customers might be calling from.
        </FormDescription>
        <Select
          value={watch('businessHours.timezone')}
          onValueChange={(val: string) => setValue('businessHours.timezone', val)}
        >
          <SelectTrigger 
            className={errors.businessHours?.timezone ? 'border-destructive' : ''}
            aria-invalid={errors.businessHours?.timezone ? 'true' : 'false'}
          >
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="America/New_York">Eastern Time</SelectItem>
            <SelectItem value="America/Chicago">Central Time</SelectItem>
            <SelectItem value="America/Denver">Mountain Time</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
          </SelectContent>
        </Select>
        {errors.businessHours?.timezone && (
          <p className="text-sm text-destructive">
            {errors.businessHours.timezone.message}
          </p>
        )}
      </div>
    </div>
  )
}
