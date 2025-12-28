"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useAppStore, type ImageSessionData, type GeneratedImage } from "@/lib/store"
import { Sparkles, Download, Settings2, Loader2, RefreshCw, PlusCircle, Sliders, X, Maximize2, Trash2, RotateCcw, ChevronLeft, ChevronRight, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Masonry from 'react-masonry-css'

const RESOLUTION_PRESETS = [
  "1024x1024",
  "768x1344", "832x1216", "768x1280", "704x1408", 
  "1024x1536", "1536x1536", 
  "1728x1344", "1344x1728", 
  "1824x1248", "1248x1824", 
  "2016x1152", "1152x2016"
]

interface LoraItem {
  uid: string
  repo: string
  weight: number
}

export function ImageModule() {
  const { 
    apiKey, 
    imageModelId, 
    sessions, 
    activeSessionId, 
    updateSessionData, 
    createSession,
    renameSession
  } = useAppStore()

  // Generation State
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [sizePreset, setSizePreset] = useState('1024x1024')
  const [customW, setCustomW] = useState(1024)
  const [customH, setCustomH] = useState(1024)
  const [steps, setSteps] = useState(30)
  const [guidance, setGuidance] = useState(6.0)
  const [seed, setSeed] = useState('')
  const [useAdvancedParams, setUseAdvancedParams] = useState(false)
  
  // LoRA State
  const [loraItems, setLoraItems] = useState<LoraItem[]>([])
  const [isManualWeights, setIsManualWeights] = useState(false)
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(true)
  const [viewingImage, setViewingImage] = useState<GeneratedImage | null>(null)

  const currentSession = activeSessionId ? sessions[activeSessionId] : null
  const gallery = (currentSession?.type === 'image' ? (currentSession.data as ImageSessionData).images : []) as GeneratedImage[]

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`
    }
  }, [prompt])

  // Navigation Logic
  const handleNavigate = useCallback((direction: number) => {
    if (!viewingImage) return
    const currentIndex = gallery.findIndex(img => img.id === viewingImage.id)
    if (currentIndex === -1) return
    
    const newIndex = currentIndex + direction
    if (newIndex >= 0 && newIndex < gallery.length) {
      setViewingImage(gallery[newIndex])
    }
  }, [viewingImage, gallery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingImage) return
      if (e.key === 'ArrowLeft') handleNavigate(-1)
      if (e.key === 'ArrowRight') handleNavigate(1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewingImage, handleNavigate])


  // LoRA Helper Functions
  const calculateEqualWeights = (items: LoraItem[]) => {
    const count = items.length
    if (count === 0) return items
    const avg = Number((1.0 / count).toFixed(2))
    return items.map((item, idx) => ({
       ...item,
       weight: idx === count - 1 ? Number((1.0 - avg * (count - 1)).toFixed(2)) : avg 
    }))
  }

  const addLora = () => {
    if (loraItems.length >= 6) return
    const newItem = { uid: crypto.randomUUID(), repo: '', weight: 0 }
    const newItems = [...loraItems, newItem]
    
    if (!isManualWeights) {
      setLoraItems(calculateEqualWeights(newItems))
    } else {
      setLoraItems(newItems)
    }
  }

  const removeLora = (uid: string) => {
    const newItems = loraItems.filter(i => i.uid !== uid)
    if (!isManualWeights) {
      setLoraItems(calculateEqualWeights(newItems))
    } else {
      setLoraItems(newItems)
    }
  }

  const updateLoraRepo = (uid: string, val: string) => {
    setLoraItems(loraItems.map(i => i.uid === uid ? { ...i, repo: val } : i))
  }

  const updateLoraWeight = (uid: string, val: number) => {
    setIsManualWeights(true)
    setLoraItems(loraItems.map(i => i.uid === uid ? { ...i, weight: val } : i))
  }

  const resetWeights = () => {
    setIsManualWeights(false)
    setLoraItems(calculateEqualWeights(loraItems))
  }
  
  const totalWeight = loraItems.reduce((acc, cur) => acc + cur.weight, 0)
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.02 || loraItems.length === 0

  // Polling Logic
  useEffect(() => {
    if (taskId && isGenerating && activeSessionId) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/image/status/${taskId}?apiKey=${apiKey}`)
          const data = await res.json()
          
          if (data.task_status === 'SUCCEED') {
             if (pollTimerRef.current) clearInterval(pollTimerRef.current)
             setIsGenerating(false)
             setTaskId(null)
             
             if (data.output_images && data.output_images.length > 0) {
               const finalSize = sizePreset === 'custom' ? `${customW}x${customH}` : sizePreset
               const newImage: GeneratedImage = {
                 id: crypto.randomUUID(),
                 url: data.output_images[0],
                 prompt: prompt, 
                 model: imageModelId,
                 createdAt: Date.now(),
                 size: finalSize
               }
               updateSessionData(activeSessionId, { 
                 images: [newImage, ...gallery] 
               })
               toast.success("Image generated successfully!")
             }
          } else if (data.task_status === 'FAILED') {
             if (pollTimerRef.current) clearInterval(pollTimerRef.current)
             setIsGenerating(false)
             setTaskId(null)
             toast.error("Image generation failed.")
          }
        } catch (e) {
          console.error("Polling error", e)
        }
      }, 3000)
    }
    
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [taskId, isGenerating, apiKey, imageModelId, prompt, activeSessionId, gallery, updateSessionData, sizePreset, customW, customH])

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return
    if (!apiKey) {
      toast.error("Please set your API Key first")
      document.dispatchEvent(new CustomEvent('open-settings'))
      return
    }

    if (loraItems.length > 0 && !isWeightValid) {
       toast.error("Total LoRA weight must be 1.0")
       return
    }

    let sessionId = activeSessionId
    let isNewSession = false

    if (!currentSession || currentSession.type !== 'image') {
      sessionId = createSession('image')
      isNewSession = true
    }

    if (isNewSession) {
      renameSession(sessionId!, prompt.slice(0, 30))
    }

    setIsGenerating(true)
    try {
      const finalSize = sizePreset === 'custom' ? `${customW}x${customH}` : sizePreset

      let finalLoras: any = undefined
      const validLoras = loraItems.filter(i => i.repo.trim() !== '')
      
      if (validLoras.length > 0) {
        if (validLoras.length === 1 && validLoras[0].weight === 1.0) {
           finalLoras = validLoras[0].repo.trim()
        } else {
           finalLoras = {}
           validLoras.forEach(item => {
             finalLoras[item.repo.trim()] = item.weight
           })
        }
      }

      const payload: any = {
        prompt,
        negative_prompt: negativePrompt,
        size: finalSize,
        model: imageModelId,
        apiKey
      }

      if (useAdvancedParams) {
        payload.steps = steps
        payload.guidance = guidance
        if (seed) payload.seed = parseInt(seed)
        if (finalLoras) payload.loras = finalLoras
      }

      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error(await res.text())
      
      const data = await res.json()
      if (data.task_id) {
        setTaskId(data.task_id)
        toast.info("Task submitted, generating...")
      } else if (data.output_images) {
        const newImage: GeneratedImage = {
           id: crypto.randomUUID(),
           url: data.output_images[0],
           prompt: prompt,
           model: imageModelId,
           createdAt: Date.now(),
           size: finalSize
        }
        updateSessionData(sessionId!, { images: [newImage, ...gallery] })
        setIsGenerating(false)
        toast.success("Image generated!")
      }

    } catch (e: any) {
      setIsGenerating(false)
      toast.error(e.message || "Failed to start generation")
    }
  }

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Prompt copied to clipboard")
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      
      {/* Left Area: Gallery & Input */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4 pt-4 px-4">
          {gallery.length === 0 && !isGenerating ? (
             <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="p-4 rounded-full bg-muted/50 border border-border/50">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-medium">Creative Studio</h2>
                <p className="text-sm">Generate stunning images with {imageModelId}</p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-2">
              <Masonry
                breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                className="flex w-auto -ml-4 pb-24"
                columnClassName="pl-4 bg-clip-padding"
              >
                {/* Loading Placeholder */}
                {isGenerating && (
                  <div className="mb-6">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="aspect-square rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-center justify-center relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Dreaming...</p>
                    </motion.div>
                  </div>
                )}

                {/* Gallery Items */}
                {gallery.map((img) => (
                  <motion.div
                    layout
                    key={img.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setViewingImage(img)}
                    className="group relative rounded-2xl overflow-hidden bg-muted border border-border/50 shadow-sm cursor-zoom-in mb-6 break-inside-avoid"
                  >
                    {/* Simple Natural Image - No cropping, no forced aspect ratio */}
                    <img 
                      src={img.url} 
                      alt={img.prompt} 
                      className="w-full h-auto block object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
                      <p className="text-white text-xs line-clamp-2 mb-3 font-medium">{img.prompt}</p>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] text-white/70 font-mono bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-md">{img.model.split('/').pop()}</span>
                         <Maximize2 className="h-4 w-4 text-white/70" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </Masonry>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="w-full pt-2 pb-2 z-30 px-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-2xl focus-within:border-primary/50 transition-all group">
               <div className="flex gap-2 items-end">
                 <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A cyberpunk city in the rain, neon lights..."
                  rows={1}
                  className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-2 text-base leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                />
                 <div className="flex flex-row gap-1 justify-end pb-0.5 pr-0.5">
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground",
                        showSettings && "bg-muted text-foreground"
                      )}
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      <Sliders className="h-4 w-4" />
                    </Button>
                   <Button 
                      onClick={handleSubmit}
                      size="icon" 
                      disabled={isGenerating || !prompt.trim()}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-all active:scale-95",
                        isGenerating && "opacity-80"
                      )}
                    >
                      {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-border/50 bg-background/50 backdrop-blur-xl overflow-y-auto overflow-x-hidden"
          >
            <div className="p-5 space-y-6 w-[320px] pb-12">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">Parameters</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSettings(false)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                 {/* Size (Always Visible) */}
                 <div className="space-y-2">
                    <Label className="text-xs font-medium">Aspect Ratio / Size</Label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={sizePreset}
                      onChange={(e) => setSizePreset(e.target.value)}
                    >
                      {RESOLUTION_PRESETS.map(p => (
                        <option key={p} value={p} className="bg-background">{p}</option>
                      ))}
                      <option value="custom" className="bg-background">Custom...</option>
                    </select>
                    
                    {sizePreset === 'custom' && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="relative">
                          <Input 
                            type="number" 
                            value={customW} 
                            onChange={(e) => setCustomW(Number(e.target.value))} 
                            className="h-8 text-xs"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">W</span>
                        </div>
                        <span className="text-muted-foreground text-xs">x</span>
                        <div className="relative">
                           <Input 
                            type="number" 
                            value={customH} 
                            onChange={(e) => setCustomH(Number(e.target.value))} 
                            className="h-8 text-xs"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">H</span>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Negative Prompt (Always Visible) */}
                 <div className="space-y-2">
                    <Label htmlFor="neg-prompt" className="text-xs font-medium">Negative Prompt (Optional)</Label>
                    <Textarea 
                      id="neg-prompt" 
                      value={negativePrompt} 
                      onChange={(e) => setNegativePrompt(e.target.value)} 
                      placeholder="low quality, blurry, ugly..." 
                      className="h-20 resize-none text-xs"
                    />
                 </div>

                 {/* Advanced Toggle Divider */}
                 <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center">
                      <button 
                        onClick={() => setUseAdvancedParams(!useAdvancedParams)}
                        className={cn(
                          "bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-wider border rounded-full transition-all flex items-center gap-2",
                          useAdvancedParams ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        <Settings2 className="h-3 w-3" />
                        {useAdvancedParams ? "Advanced On" : "Advanced Off"}
                      </button>
                    </div>
                 </div>

                 {/* Advanced Settings (Grayed out if disabled) */}
                 <div className={cn("space-y-4 transition-all duration-300", !useAdvancedParams && "opacity-40 pointer-events-none grayscale")}>
                     {/* Steps */}
                     <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs font-medium">Steps ({steps})</Label>
                        </div>
                        <Input 
                          type="range" 
                          min={1} 
                          max={100} 
                          value={steps} 
                          disabled={!useAdvancedParams}
                          onChange={(e) => setSteps(Number(e.target.value))}
                          className="h-2 bg-transparent p-0 accent-primary" 
                        />
                     </div>

                     {/* Guidance */}
                     <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs font-medium">CFG ({guidance})</Label>
                        </div>
                        <Input 
                          type="range" 
                          min={1.5} 
                          max={20} 
                          step={0.5}
                          value={guidance} 
                          disabled={!useAdvancedParams}
                          onChange={(e) => setGuidance(Number(e.target.value))}
                          className="h-2 bg-transparent p-0 accent-primary" 
                        />
                     </div>

                     {/* Seed */}
                     <div className="space-y-2">
                        <Label htmlFor="seed" className="text-xs font-medium">Seed (Optional)</Label>
                        <Input 
                          id="seed" 
                          type="number" 
                          value={seed} 
                          disabled={!useAdvancedParams}
                          onChange={(e) => setSeed(e.target.value)} 
                          placeholder="Random" 
                          className="h-8 text-xs"
                        />
                     </div>

                     {/* LoRAs */}
                     <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium">LoRAs ({loraItems.length}/6)</Label>
                          </div>
                          {isManualWeights && (
                            <Button variant="ghost" size="sm" onClick={resetWeights} className="h-6 text-[10px] px-2 gap-1 text-primary">
                              <RotateCcw className="h-3 w-3" /> Auto-Balance
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                           {loraItems.map((item) => (
                             <div key={item.uid} className="flex gap-2 items-center">
                               <Input 
                                 value={item.repo}
                                 disabled={!useAdvancedParams}
                                 onChange={(e) => updateLoraRepo(item.uid, e.target.value)}
                                 placeholder="Repo ID" 
                                 className="h-8 text-xs flex-1 min-w-0"
                               />
                               <Input 
                                 type="number"
                                 min={0}
                                 max={1}
                                 step={0.05}
                                 value={item.weight}
                                 disabled={!useAdvancedParams}
                                 onChange={(e) => updateLoraWeight(item.uid, Number(e.target.value))}
                                 className={cn(
                                   "h-8 w-16 text-xs text-center px-1",
                                   isManualWeights && "border-primary/50"
                                 )}
                               />
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 disabled={!useAdvancedParams}
                                 onClick={() => removeLora(item.uid)}
                                 className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                               >
                                 <Trash2 className="h-3.5 w-3.5" />
                               </Button>
                             </div>
                           ))}
                           
                           {loraItems.length < 6 && (
                             <Button variant="outline" size="sm" onClick={addLora} disabled={!useAdvancedParams} className="w-full h-8 text-xs border-dashed gap-2">
                               <PlusCircle className="h-3.5 w-3.5" /> Add LoRA
                             </Button>
                           )}
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>Total Weights: <span className={cn("font-mono", !isWeightValid && "text-destructive font-bold")}>{totalWeight.toFixed(2)}</span></span>
                          <span>Target: 1.0</span>
                        </div>
                     </div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-0 border-none bg-transparent shadow-none flex flex-col items-center justify-center">
           <DialogTitle className="sr-only">Image View</DialogTitle>
           <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={(e) => {
             if (e.target === e.currentTarget) setViewingImage(null)
           }}>
             {viewingImage && (
               <>
                 <div className="relative flex items-center justify-center w-full h-full px-12">
                   {/* Prev Button */}
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="absolute left-2 h-12 w-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-md text-white border border-white/10"
                     onClick={(e) => { e.stopPropagation(); handleNavigate(-1) }}
                   >
                     <ChevronLeft className="h-6 w-6" />
                   </Button>

                   <AnimatePresence mode="wait">
                     <motion.img 
                        key={viewingImage.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        src={viewingImage.url} 
                        alt="Full view" 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                     />
                   </AnimatePresence>

                   {/* Next Button */}
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="absolute right-2 h-12 w-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-md text-white border border-white/10"
                     onClick={(e) => { e.stopPropagation(); handleNavigate(1) }}
                   >
                     <ChevronRight className="h-6 w-6" />
                   </Button>
                 </div>
                 
                 <div className="mt-4 bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 max-w-3xl w-full flex items-center gap-4 shadow-2xl z-50" onClick={(e) => e.stopPropagation()}>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <p className="text-sm font-medium line-clamp-2" title={viewingImage.prompt}>{viewingImage.prompt}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>{viewingImage.model.split('/').pop()}</span>
                        {viewingImage.size && (
                           <>
                             <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                             <span className="bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">{viewingImage.size}</span>
                           </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        <span>{new Date(viewingImage.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button onClick={() => copyPrompt(viewingImage.prompt)} variant="secondary" size="icon" className="rounded-xl" title="Copy Prompt">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => window.open(viewingImage.url, '_blank')} variant="secondary" size="icon" className="rounded-xl" title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => setViewingImage(null)} variant="ghost" size="icon" className="rounded-xl hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                 </div>
               </>
             )}
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}