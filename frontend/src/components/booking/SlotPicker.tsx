import { useEffect, useCallback } from 'react'
import { turfApi } from '@/lib/api'
import { useBookingStore, type Slot } from '@/store/bookingStore'
import { Loader2 } from 'lucide-react'
import { addDays, format, isBefore, startOfDay, parseISO } from 'date-fns'

interface SlotPickerProps {
  turfSlug: string
  turfId?: string   // kept for potential future use; not consumed internally
  onSlotSelect: (slot: Slot) => void
}

/** Generate array of next N dates from today */
const getDateRange = (n = 14) =>
  Array.from({ length: n }, (_, i) => addDays(new Date(), i))

const STATUS_CLASSES: Record<string, string> = {
  Available: 'slot-available',
  Pending:   'slot-pending',
  Paid:      'slot-paid',
}

/**
 * SlotPicker — WCAG 2.1 compliant
 * - Keyboard navigable via Tab + Enter/Space
 * - ARIA roles: grid, gridcell, row
 * - Optimistic UI: slot immediately shows "Pending" on click before API resolves
 */
export default function SlotPicker({ turfSlug, onSlotSelect }: SlotPickerProps) {
  const {
    selectedDate, setDate,
    slots, setSlots, setSlotsLoading, slotsLoading,
    draft, selectSlot,
    optimisticPending, markOptimisticPending,
  } = useBookingStore()

  const dates = getDateRange(14)

  const fetchSlots = useCallback(async (date: string) => {
    setSlotsLoading(true)
    try {
      const res = await turfApi.slots(turfSlug, date)
      setSlots(res.data.data.slots)
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [turfSlug, setSlots, setSlotsLoading])

  useEffect(() => {
    fetchSlots(selectedDate)
  }, [selectedDate, fetchSlots])

  const handleSlotClick = (slot: Slot) => {
    if (!slot.isAvailable && !optimisticPending.includes(slot.startTime)) return

    // Optimistic UI — mark as pending immediately
    markOptimisticPending(slot.startTime)
    selectSlot(slot)
    onSlotSelect(slot)
  }

  const getSlotClass = (slot: Slot) => {
    if (draft?.slot?.startTime === slot.startTime) return 'slot-selected'
    if (optimisticPending.includes(slot.startTime) && slot.status === 'Available') return 'slot-pending'
    return STATUS_CLASSES[slot.status] || 'slot-available'
  }

  const getSlotLabel = (slot: Slot) => {
    if (draft?.slot?.startTime === slot.startTime) return 'Selected'
    if (optimisticPending.includes(slot.startTime) && slot.status === 'Available') return 'Pending…'
    return slot.status
  }

  return (
    <div className="space-y-6">
      {/* ── Date Picker ── */}
      <div>
        <h3 className="text-xs font-semibold text-[#525252] uppercase tracking-widest mb-3">
          Select Date
        </h3>
        <div
          className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
          role="group"
          aria-label="Date selection"
        >
          {dates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd')
            const isSelected = selectedDate === dateStr
            const isPast = isBefore(startOfDay(date), startOfDay(new Date()))
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

            return (
              <button
                key={dateStr}
                onClick={() => !isPast && setDate(dateStr)}
                disabled={isPast}
                aria-label={`${format(date, 'EEEE, MMMM d')}${isToday ? ' (Today)' : ''}`}
                aria-pressed={isSelected}
                className={`shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-xl border
                            text-xs font-medium transition-all duration-200 min-w-[52px]
                            focus-visible:outline-none focus-visible:ring-2
                            focus-visible:ring-[#CCFF00] focus-visible:ring-offset-1
                            focus-visible:ring-offset-[#0f0f0f]
                  ${isSelected
                    ? 'bg-[rgba(204,255,0,0.12)] border-[#CCFF00] text-[#CCFF00]'
                    : isPast
                      ? 'border-[#1a1a1a] text-[#3d3d3d] cursor-not-allowed opacity-40'
                      : 'border-[#252525] text-[#a3a3a3] hover:border-[#3d3d3d] hover:text-[#f5f5f5]'
                  }`}
              >
                <span className="text-[10px] uppercase">{format(date, 'EEE')}</span>
                <span className="text-base font-bold">{format(date, 'd')}</span>
                {isToday && <span className="text-[9px] text-[#CCFF00] mt-0.5">Today</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Slot Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#525252] uppercase tracking-widest">
            Available Slots — {format(parseISO(selectedDate), 'MMMM d, yyyy')}
          </h3>
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-[#525252]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border border-[#252525] bg-[#0f0f0f]" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/30" />
              Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1a1a1a] opacity-40" />
              Booked
            </span>
          </div>
        </div>

        {slotsLoading ? (
          <div className="flex items-center justify-center h-40 text-[#525252]">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Loading slots…</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12 text-[#525252]">
            <p className="text-sm">No slots available for this date.</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5"
            role="grid"
            aria-label="Time slot selection grid"
          >
            {slots.map(slot => (
              <div key={slot.startTime} role="row">
                <button
                  role="gridcell"
                  className={getSlotClass(slot)}
                  onClick={() => handleSlotClick(slot)}
                  disabled={!slot.isAvailable && !optimisticPending.includes(slot.startTime)}
                  aria-label={`${slot.startTime} to ${slot.endTime}, ₹${slot.price}, ${getSlotLabel(slot)}`}
                  aria-pressed={draft?.slot?.startTime === slot.startTime}
                >
                  <span className="font-bold text-[13px]">{slot.startTime}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">₹{slot.price}</span>
                  <span className="text-[9px] opacity-50 mt-0.5">{getSlotLabel(slot)}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
