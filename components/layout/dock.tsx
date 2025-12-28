"use client"

import {
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion"
import { useRef } from "react"
import { cn } from "@/lib/utils"
import { useAppStore, type ModuleType } from "@/lib/store"
import { MessageSquare, Image as ImageIcon, Eye, Settings } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function Dock() {
  const mouseX = useMotionValue(Infinity)
  const { currentModule, setCurrentModule } = useAppStore()

  const items = [
    { id: 'chat', icon: MessageSquare, label: 'Chat (LLM)' },
    { id: 'vision', icon: Eye, label: 'Vision (VLM)' },
    { id: 'image', icon: ImageIcon, label: 'Studio (AIGC)' },
  ] as const

  return (
    <TooltipProvider>
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex h-16 items-end gap-4 rounded-2xl border bg-background/50 backdrop-blur-md px-4 pb-3 shadow-2xl dark:border-white/10 dark:bg-black/50 pointer-events-auto"
      >
        {items.map((item) => (
          <DockIcon
            key={item.id}
            mouseX={mouseX}
            icon={item.icon}
            label={item.label}
            isActive={currentModule === item.id}
            onClick={() => setCurrentModule(item.id)}
          />
        ))}
        
        <div className="h-10 w-[1px] bg-border/50 my-auto" />
        
        <DockIcon
          mouseX={mouseX}
          icon={Settings}
          label="Settings"
          isActive={false}
          onClick={() => {
            document.dispatchEvent(new CustomEvent('open-settings'))
          }}
        />
      </motion.div>
    </TooltipProvider>
  )
}

function DockIcon({
  mouseX,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  mouseX: MotionValue
  icon: any
  label: string
  isActive: boolean
  onClick: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40])
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          ref={ref}
          style={{ width }}
          onClick={onClick}
          className={cn(
            "aspect-square w-10 cursor-pointer rounded-full flex items-center justify-center transition-colors",
            isActive ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </TooltipTrigger>
      <TooltipContent sideOffset={10} className="bg-black/80 text-white dark:bg-white/90 dark:text-black font-medium backdrop-blur-sm border-none">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
