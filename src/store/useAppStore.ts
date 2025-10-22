"use client"
import { create } from 'zustand'

export type Message = { role: 'assistant' | 'user', content: string, ipaData?: { ipa: IPAItem[], tips?: string } }
export type IPAItem = { word: string, ipa: string }

type AppState = {
  provider: 'openai' | 'gemini'
  apiKey?: string
  model?: string
  messages: Message[]
  ipa?: { ipa: IPAItem[], tips?: string }
  turns: number
  setProvider: (p: 'openai' | 'gemini') => void
  setApiKey: (k: string) => void
  setModel: (m: string) => void
  addMessage: (m: Message) => void
  setIPA: (d?: { ipa: IPAItem[], tips?: string }) => void
  incTurns: () => void
  clearConversation: () => void
}

export const useAppStore = create<AppState>((set) => ({
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  messages: [{ role: 'assistant', content: "Hello! Tap the mic to speak. I will prompt and give IPA tips." }],
  ipa: undefined,
  turns: 0,
  setProvider: (p) => set({ provider: p }),
  setApiKey: (k) => set({ apiKey: k }),
  setModel: (m) => set({ model: m }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setIPA: (d) => set({ ipa: d }),
  incTurns: () => set((s) => ({ turns: s.turns + 1 })),
  clearConversation: () => set({ messages: [{ role: 'assistant', content: "Conversation cleared. Let's start again!" }], ipa: undefined, turns: 0 }),
}))
