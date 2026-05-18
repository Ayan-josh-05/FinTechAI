import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  query?: string
  output?: string
  sources?: Array<{
    case_id?: string
    case_no?: string
    case_title?: string
    case_type?: string
    court?: string
  }>
  isStreaming?: boolean
  jobId?: string
  feedback?: {
    reaction: 'like' | 'dislike'
    feedbackText?: string
    feedbackId: string
  }
}

interface SemanticSearchState {
  currentQuestion: string
  currentChatId: string | null
  chatMessages: Array<ChatMessage>
  isNewChat: boolean
  
  setCurrentQuestion: (question: string) => void
  clearCurrentQuestion: () => void
  setCurrentChatId: (chatId: string | null) => void
  setChatMessages: (messages: Array<ChatMessage>) => void
  addChatMessage: (message: ChatMessage) => void
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) => void
  clearChat: () => void
  setIsNewChat: (isNew: boolean) => void
  setMessageFeedback: (messageId: string, feedback: ChatMessage['feedback']) => void
  clearMessageFeedback: (messageId: string) => void
}

export const useSemanticSearchStore = create<SemanticSearchState>()((set) => ({
  currentQuestion: '',
  currentChatId: null,
  chatMessages: [],
  isNewChat: false,
  
  setCurrentQuestion: (question: string) => set({ currentQuestion: question }),
  clearCurrentQuestion: () => set({ currentQuestion: '' }),
  setCurrentChatId: (chatId: string | null) => set({ currentChatId: chatId }),
  setChatMessages: (messages: Array<ChatMessage> | ((prev: Array<ChatMessage>) => Array<ChatMessage>)) => 
    set((state) => ({ 
      chatMessages: typeof messages === 'function' ? messages(state.chatMessages) : messages 
    })),
  addChatMessage: (message: ChatMessage) => 
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) =>
    set((state) => ({
      chatMessages: state.chatMessages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    })),
  clearChat: () => set({ 
    currentChatId: null, 
    chatMessages: [], 
    currentQuestion: '',
    isNewChat: false 
  }),
  setIsNewChat: (isNew: boolean) => set({ isNewChat: isNew }),
  setMessageFeedback: (messageId: string, feedback: ChatMessage['feedback']) =>
    set((state) => ({
      chatMessages: state.chatMessages.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    })),
  clearMessageFeedback: (messageId: string) =>
    set((state) => ({
      chatMessages: state.chatMessages.map(msg =>
        msg.id === messageId ? { ...msg, feedback: undefined } : msg
      )
    })),
}))
