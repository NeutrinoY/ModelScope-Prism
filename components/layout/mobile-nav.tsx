"use client"

import { useAppStore } from "@/lib/store"
import { MessageSquare, Image as ImageIcon, Eye, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function MobileNav() {
  const { currentModule, setCurrentModule } = useAppStore()

  const tabs = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'vision', icon: Eye, label: 'Vision' },
    { id: 'image', icon: ImageIcon, label: 'Art' },
  ]

  const handleSettings = () => {
    document.dispatchEvent(new CustomEvent('open-settings'))
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      <div className="bg-background/80 backdrop-blur-xl border-t border-border/50 px-6 py-2 flex items-center justify-between shadow-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentModule(tab.id as any)}
            className="flex flex-col items-center gap-1 p-2 relative group"
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all duration-300",
              currentModule === tab.id 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground group-hover:text-foreground"
            )}>
              <tab.icon className={cn("h-6 w-6", currentModule === tab.id && "fill-current")} strokeWidth={currentModule === tab.id ? 2 : 1.5} />
            </div>
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              currentModule === tab.id ? "text-primary" : "text-muted-foreground"
            )}>
              {tab.label}
            </span>
            {currentModule === tab.id && (
              <motion.div 
                layoutId="mobile-nav-indicator"
                className="absolute -top-[1px] left-0 right-0 h-[2px] bg-primary/50 mx-4 rounded-full"
              />
            )}
          </button>
        ))}

        <button
          onClick={handleSettings}
          className="flex flex-col items-center gap-1 p-2 relative group"
        >
          <div className="p-1.5 rounded-xl text-muted-foreground group-hover:text-foreground transition-all duration-300">
            <Settings2 className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            Settings
          </span>
        </button>
      </div>
    </div>
  )
}
