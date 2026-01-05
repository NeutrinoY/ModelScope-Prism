"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import { BrainCircuit } from "lucide-react"

export function SettingsModal() {
  const [open, setOpen] = useState(false)
  
  const { 
    apiKey, setApiKey,
    chatModelId, setChatModelId,
    visionModelId, setVisionModelId,
    imageModelId, setImageModelId,
    enableThinking, setEnableThinking
  } = useAppStore()

  const [localApiKey, setLocalApiKey] = useState('')
  const [localChatId, setLocalChatId] = useState('')
  const [localVisionId, setLocalVisionId] = useState('')
  const [localImageId, setLocalImageId] = useState('')
  const [localThinking, setLocalThinking] = useState(false)

  useEffect(() => {
    const handleOpen = () => setOpen(true)
    document.addEventListener('open-settings', handleOpen)
    return () => document.removeEventListener('open-settings', handleOpen)
  }, [])

  useEffect(() => {
    if (open) {
      setLocalApiKey(apiKey)
      setLocalChatId(chatModelId)
      setLocalVisionId(visionModelId)
      setLocalImageId(imageModelId)
      setLocalThinking(enableThinking)
    }
  }, [open, apiKey, chatModelId, visionModelId, imageModelId, enableThinking])

  const handleSave = () => {
    setApiKey(localApiKey)
    setChatModelId(localChatId)
    setVisionModelId(localVisionId)
    setImageModelId(localImageId)
    setEnableThinking(localThinking)
    
    setOpen(false)
    toast.success("Settings saved")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] overflow-y-auto max-h-[85vh] p-4 md:p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle>Global Settings</DialogTitle>
          <DialogDescription>
            Configure your API access and default models.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">ModelScope Access Token</Label>
            <Input
              id="api-key"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              type="password"
              placeholder="sk-..."
            />
            <div className="text-[10px] text-muted-foreground">
              Get token from <a href="https://modelscope.cn/my/myaccesstoken" target="_blank" className="underline hover:text-primary">ModelScope</a>
            </div>
          </div>

          <div className="border-t border-border/50 my-1" />

          {/* Chat Settings */}
          <div className="space-y-3">
             <div className="flex items-center gap-2">
               <Label htmlFor="chat-model">Chat Model ID</Label>
             </div>
             <Input
               id="chat-model"
               value={localChatId}
               onChange={(e) => setLocalChatId(e.target.value)}
               placeholder="e.g. deepseek-ai/DeepSeek-V3.2"
             />
             
             {/* Thinking Mode Toggle */}
             <div className="flex items-center space-x-3 pt-1">
                <input 
                  type="checkbox" 
                  id="thinking-mode" 
                  checked={localThinking} 
                  onChange={(e) => setLocalThinking(e.target.checked)}
                  className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary shadow-sm"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="thinking-mode"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <BrainCircuit className="h-3.5 w-3.5" />
                    Enable Thinking Process
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Only applies to Custom Models. Presets have their own toggles.
                  </p>
                </div>
             </div>
          </div>

          {/* Vision Settings */}
          <div className="space-y-2">
             <Label htmlFor="vision-model">Vision Model ID</Label>
             <Input
               id="vision-model"
               value={localVisionId}
               onChange={(e) => setLocalVisionId(e.target.value)}
               placeholder="e.g. Qwen/Qwen3-VL-235B-A22B-Instruct"
             />
          </div>

          {/* Image Settings */}
          <div className="space-y-2">
             <Label htmlFor="image-model">Image Gen Model ID</Label>
             <Input
               id="image-model"
               value={localImageId}
               onChange={(e) => setLocalImageId(e.target.value)}
               placeholder="e.g. Qwen/Qwen-Image"
             />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}