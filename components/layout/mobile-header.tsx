"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { useAppStore } from "@/lib/store"

export function MobileHeader() {
  const { currentModule } = useAppStore()

  const getTitle = () => {
    switch (currentModule) {
      case 'chat': return 'LLM Chat'
      case 'vision': return 'Vision Analyst'
      case 'image': return 'Creative Studio'
      default: return 'ModelScope Prism'
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-14 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-4 md:hidden">
      <Sidebar 
        customTrigger={
          <Button variant="ghost" size="icon" className="-ml-2">
            <Menu className="h-5 w-5" />
          </Button>
        } 
      />
      <span className="font-medium text-sm tracking-wide">{getTitle()}</span>
      <div className="w-9" /> {/* Spacer to balance layout */}
    </div>
  )
}
