"use client"

import { useAppStore } from "@/lib/store"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TopBar() {
  const { 
    currentModule, 
    chatModelId, setChatModelId,
    visionModelId, setVisionModelId,
    imageModelId, setImageModelId
  } = useAppStore()

  const getModelConfig = () => {
    switch (currentModule) {
      case 'chat': return { id: chatModelId, set: setChatModelId, label: 'LLM Model ID' }
      case 'vision': return { id: visionModelId, set: setVisionModelId, label: 'VLM Model ID' }
      case 'image': return { id: imageModelId, set: setImageModelId, label: 'AIGC Model ID' }
      default: return { id: '', set: () => {}, label: '' }
    }
  }

  const config = getModelConfig()

  return (
    <div className="fixed top-0 left-0 right-0 h-16 flex items-start justify-center z-40 bg-gradient-to-b from-background to-transparent pointer-events-none pt-4">
      <div className="pointer-events-auto bg-background/50 backdrop-blur-md border border-border/50 rounded-full px-6 py-2 shadow-sm flex items-center gap-4 transition-all hover:bg-background/80 hover:shadow-md h-10">
        <Label className="text-xs text-muted-foreground font-mono uppercase tracking-wider whitespace-nowrap">
          {config.label}
        </Label>
        <div className="h-4 w-[1px] bg-border" />
        <Input 
          className="h-6 w-[280px] border-none bg-transparent focus-visible:ring-0 px-0 text-sm font-medium"
          value={config.id}
          onChange={(e) => config.set(e.target.value)}
          placeholder="Enter Model ID..."
        />
      </div>
    </div>
  )
}
