"use client"

import { useState, useRef, useEffect } from "react"
import { useAppStore, type Message, type ChatSessionData } from "@/lib/store"
import { LLM_SERIES } from "@/lib/models"
import { Send, User, Bot, Loader2, BrainCircuit, Settings2, ChevronDown, ChevronUp, ChevronRight, LayoutPanelTop } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownRenderer } from "@/components/shared/markdown-renderer"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ChatModule() {
  const { 
    apiKey, 
    chatModelId,
    setChatModelId, 
    sessions, 
    activeSessionId, 
    updateSessionData, 
    createSession,
    renameSession,
    enableThinking 
  } = useAppStore()
  
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [forceShowSelector, setForceShowSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [presetThinking, setPresetThinking] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`
    }
  }, [input])

  const currentSession = activeSessionId ? sessions[activeSessionId] : null
  const messages = (currentSession?.type === 'chat' ? (currentSession.data as ChatSessionData).messages : []) as Message[]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    if (!apiKey) {
      toast.error("Please set your API Key in settings first")
      document.dispatchEvent(new CustomEvent('open-settings'))
      return
    }

    let sessionId = activeSessionId
    if (!currentSession || currentSession.type !== 'chat') {
      sessionId = createSession('chat')
    }

    const userMessage: Message = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    updateSessionData(sessionId!, { messages: updatedMessages })
    
    setInput('')
    setIsLoading(true)
    setForceShowSelector(false)

    // Reasoning Logic
    const currentSeries = LLM_SERIES.find(s => s.instruct.id === chatModelId || s.thinking?.id === chatModelId)
    let finalEnableThinking = enableThinking
    if (currentSeries) {
       finalEnableThinking = currentSeries.isIdSwitch ? chatModelId === currentSeries.thinking?.id : !!presetThinking[currentSeries.key]
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          model: chatModelId,
          apiKey: apiKey,
          enableThinking: finalEnableThinking
        })
      })

      if (!response.ok) throw new Error("Failed to connect to API")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let assistantReasoning = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.r) assistantReasoning += data.r
            if (data.c) assistantContent += data.c
            
            updateSessionData(sessionId!, { 
              messages: [...updatedMessages, { 
                role: 'assistant', 
                content: assistantContent, 
                reasoning: assistantReasoning 
              }] 
            })
          } catch (e) { } 
        }
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const currentSeries = LLM_SERIES.find(s => s.instruct.id === chatModelId || s.thinking?.id === chatModelId)
  const isCustomModel = !currentSeries

  const handleSeriesClick = (series: typeof LLM_SERIES[0]) => {
    setChatModelId(series.instruct.id)
  }

  const toggleReasoning = (e: React.MouseEvent, series: typeof LLM_SERIES[0]) => {
    e.stopPropagation()
    if (!series.thinking) return
    if (series.isIdSwitch) {
       const isThinking = chatModelId === series.thinking.id
       setChatModelId(isThinking ? series.instruct.id : series.thinking.id)
    } else {
       setPresetThinking(prev => ({ ...prev, [series.key]: !prev[series.key] }))
    }
  }

  // Helper for UI thinking status
  const isCurrentlyReasoning = currentSeries 
    ? (currentSeries.isIdSwitch ? chatModelId === currentSeries.thinking?.id : !!presetThinking[currentSeries.key])
    : enableThinking

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative overflow-hidden h-full">
      
      {/* Model Selector - Smart Collapsible */}
      <div className="w-full px-4 pt-1 pb-1 z-30 flex-none">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {(messages.length === 0 || forceShowSelector) ? (
              <motion.div 
                key="full-selector"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-muted/30 border border-border/50 rounded-2xl p-1.5 flex items-stretch gap-1 min-h-[56px]"
              >
                <LayoutGroup>
                  {LLM_SERIES.map((series) => {
                    const isSelected = currentSeries?.key === series.key
                    const isOn = series.isIdSwitch ? (isSelected && chatModelId === series.thinking?.id) : (!!presetThinking[series.key])
                    return (
                      <button
                        key={series.key}
                        onClick={() => handleSeriesClick(series)}
                        className={cn(
                          "flex-1 rounded-xl text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-1 relative py-1.5",
                          isSelected ? "text-foreground" : "text-muted-foreground hover:bg-background/40"
                        )}
                      >
                        <span className="font-semibold z-10">{series.name}</span>
                        {series.thinking && (
                          <div 
                            onClick={(e) => toggleReasoning(e, series)}
                            className={cn(
                              "z-20 text-[8px] px-1.5 py-0.5 rounded-full border transition-all flex items-center gap-1",
                              isOn ? "bg-primary text-primary-foreground border-primary" : "bg-background/40 border-border/40 text-muted-foreground/70"
                            )}
                          >
                            <BrainCircuit className="h-2 w-2" /> Reasoning
                          </div>
                        )}
                        {isSelected && (
                          <motion.div layoutId="act-bg" className="absolute inset-0 bg-background shadow-sm border border-border/50 rounded-xl -z-10" />
                        )}
                      </button>
                    )
                  })}
                  <button onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))} className={cn("flex-1 rounded-xl text-[11px] transition-all flex flex-col items-center justify-center gap-1 relative", isCustomModel ? "text-foreground" : "text-muted-foreground")}>
                    <span className="font-semibold z-10">Custom</span>
                    <Settings2 className="h-3 w-3 opacity-50 z-10" />
                    {isCustomModel && <motion.div layoutId="act-bg" className="absolute inset-0 bg-background shadow-sm border border-border/50 rounded-xl -z-10" />}
                  </button>
                </LayoutGroup>
              </motion.div>
            ) : (
              <motion.div 
                key="compact-selector"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between px-4 py-2 bg-muted/20 border border-border/30 rounded-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Model:</span>
                  <span className="text-xs font-semibold">{currentSeries?.name || chatModelId.split('/').pop()}</span>
                  <div className={cn("text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border", isCurrentlyReasoning ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-transparent")}>
                    <BrainCircuit className="h-2.5 w-2.5" />
                    {isCurrentlyReasoning ? "Reasoning Active" : "Chat Mode"}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setForceShowSelector(true)} className="h-7 text-[10px] gap-1 hover:bg-background">
                  <LayoutPanelTop className="h-3 w-3" /> Change Model
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 overflow-y-auto p-4">
          <div className="space-y-6 min-h-full max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 absolute inset-0">
                <div className="p-4 rounded-full bg-muted/50 border border-border/50"><Bot className="h-8 w-8" /></div>
                <h2 className="text-xl font-medium">ModelScope Prism</h2>
                <p className="text-sm">Deep reasoning & conversational AI</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 border", msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-all", msg.role === 'user' ? "bg-primary/5 border border-primary/10" : "bg-muted/30 border border-border/30")}>
                  
                  {/* Reasoning Block */}
                  {msg.reasoning && (
                    <div className="mb-3 border-l-2 border-primary/20 pl-3 py-1">
                      <details className="group" open={isLoading && i === messages.length - 1}>
                        <summary className="text-[11px] font-medium text-muted-foreground cursor-pointer list-none flex items-center gap-1.5 hover:text-primary transition-colors">
                          <BrainCircuit className="h-3 w-3" />
                          <span>{isLoading && i === messages.length - 1 ? "Thinking..." : "Deep Thought Process"}</span>
                          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80 font-mono whitespace-pre-wrap">
                          {msg.reasoning}
                        </div>
                      </details>
                    </div>
                  )}

                  <MarkdownRenderer content={msg.content as string} />
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length-1]?.role === 'user' && (
              <div className="flex gap-4 animate-pulse"><div className="h-8 w-8 rounded-full bg-muted border" /><div className="bg-muted/20 border rounded-2xl px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div></div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      <div className="w-full px-4 pt-2 pb-2 z-30">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <form onSubmit={handleSubmit} className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-2 shadow-2xl focus-within:border-primary/50 transition-all group flex items-end gap-2">
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())} placeholder="Message ModelScope..." rows={1} className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-2 text-base leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent" />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-9 w-9 shrink-0 rounded-xl transition-all mb-0.5"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </div>
    </div>
  )
}
