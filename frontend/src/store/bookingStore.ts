import { create } from 'zustand'

export interface Slot {
  startTime: string
  endTime: string
  price: number
  status: 'Available' | 'Pending' | 'Paid'
  isAvailable: boolean
}

export interface BookingDraft {
  turfId: string
  turfName: string
  turfSlug: string
  date: string
  slot: Slot | null
}

interface BookingState {
  draft: BookingDraft | null
  selectedDate: string
  slots: Slot[]
  slotsLoading: boolean
  optimisticPending: string[] // startTimes marked pending before API responds

  setDraft:   (draft: BookingDraft) => void
  clearDraft: () => void
  setDate:    (date: string) => void
  setSlots:   (slots: Slot[]) => void
  setSlotsLoading: (v: boolean) => void
  selectSlot: (slot: Slot) => void
  markOptimisticPending: (startTime: string) => void
  clearOptimistic: () => void
}

export const useBookingStore = create<BookingState>((set) => ({
  draft: null,
  selectedDate: new Date().toISOString().slice(0, 10),
  slots: [],
  slotsLoading: false,
  optimisticPending: [],

  setDraft:   (draft) => set({ draft }),
  clearDraft: () => set({ draft: null, slots: [], optimisticPending: [] }),
  setDate:    (date) => set({ selectedDate: date, slots: [], optimisticPending: [] }),
  setSlots:   (slots) => set({ slots }),
  setSlotsLoading: (v) => set({ slotsLoading: v }),

  selectSlot: (slot) =>
    set((s) => ({
      draft: s.draft ? { ...s.draft, slot } : null,
    })),

  markOptimisticPending: (startTime) =>
    set((s) => ({
      optimisticPending: [...s.optimisticPending, startTime],
    })),

  clearOptimistic: () => set({ optimisticPending: [] }),
}))
