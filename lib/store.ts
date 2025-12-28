import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModuleType = 'chat' | 'vision' | 'image'

export interface Message {
  role: 'user' | 'assistant'
  content: string | any[]
  reasoning?: string // Added for thinking models
}

// Session Data Types

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  model: string
  createdAt: number
  size?: string
}

// Session Data Types
export interface ChatSessionData {
  messages: Message[]
}

export interface VisionSessionData {
  messages: Message[]
}

export interface ImageSessionData {
  images: GeneratedImage[]
}

export interface Session {
  id: string
  type: ModuleType
  title: string
  createdAt: number
  updatedAt: number
  // Store specific data based on type
  data: ChatSessionData | VisionSessionData | ImageSessionData
}

interface AppState {
  apiKey: string
  setApiKey: (key: string) => void
  
  currentModule: ModuleType
  setCurrentModule: (module: ModuleType) => void

  // Model IDs
  chatModelId: string
  setChatModelId: (id: string) => void
  visionModelId: string
  setVisionModelId: (id: string) => void
  imageModelId: string
  setImageModelId: (id: string) => void
  
  // Settings
  enableThinking: boolean
  setEnableThinking: (enabled: boolean) => void

  // Session Management
  sessions: Record<string, Session>
  activeSessionId: string | null
  
  createSession: (type: ModuleType) => string
  deleteSession: (id: string) => void
  renameSession: (id: string, newTitle: string) => void
  setActiveSessionId: (id: string | null) => void
  
  // Data Updates (Generic helpers to avoid huge switch cases in components)
  updateSessionData: (sessionId: string, newData: Partial<ChatSessionData | VisionSessionData | ImageSessionData>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),
      
      currentModule: 'chat',
      setCurrentModule: (currentModule) => set({ currentModule }),
      
      chatModelId: 'deepseek-ai/DeepSeek-V3.2',
      setChatModelId: (chatModelId) => set({ chatModelId }),
      
      visionModelId: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
      setVisionModelId: (visionModelId) => set({ visionModelId }),
      
      imageModelId: 'Qwen/Qwen-Image',
      setImageModelId: (imageModelId) => set({ imageModelId }),

      enableThinking: false,
      setEnableThinking: (enableThinking) => set({ enableThinking }),

      sessions: {},
      activeSessionId: null,

      createSession: (type) => {
        const id = crypto.randomUUID()
        const newSession: Session = {
          id,
          type,
          title: 'New Session', // Components can update this later based on first message
          createdAt: Date.now(),
          updatedAt: Date.now(),
          data: type === 'image' ? { images: [] } : { messages: [] }
        }
        
        set((state) => ({
          sessions: { [id]: newSession, ...state.sessions },
          activeSessionId: id,
          currentModule: type // Auto switch module
        }))
        return id
      },

      deleteSession: (id) => set((state) => {
        const newSessions = { ...state.sessions }
        delete newSessions[id]
        // If deleting active session, clear selection
        const newActiveId = state.activeSessionId === id ? null : state.activeSessionId
        return { sessions: newSessions, activeSessionId: newActiveId }
      }),

      renameSession: (id, newTitle) => set((state) => {
        const session = state.sessions[id]
        if (!session) return state
        return {
          sessions: {
            ...state.sessions,
            [id]: { ...session, title: newTitle, updatedAt: Date.now() }
          }
        }
      }),

      setActiveSessionId: (id) => set({ activeSessionId: id }),

      updateSessionData: (sessionId, newData) => set((state) => {
        const session = state.sessions[sessionId]
        if (!session) return state
        
        // Deep merge data based on type
        let updatedData = { ...session.data }
        
        if (session.type === 'chat' || session.type === 'vision') {
           const messages = (newData as any).messages
           if (messages) updatedData = { ...updatedData, messages }
        } else if (session.type === 'image') {
           const images = (newData as any).images
           if (images) updatedData = { ...updatedData, images }
        }

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: { 
              ...session, 
              data: updatedData as any,
              updatedAt: Date.now() 
            }
          }
        }
      })
    }),
    {
      name: 'modelscope-storage-v3', // Changed name to reset storage and avoid conflicts
      partialize: (state) => ({ 
        apiKey: state.apiKey,
        chatModelId: state.chatModelId,
        visionModelId: state.visionModelId,
        imageModelId: state.imageModelId,
        enableThinking: state.enableThinking,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId
      }),
    }
  )
)