"use client"

import { useAppStore } from "@/lib/store"
import { Dock } from "@/components/layout/dock"
import { TopBar } from "@/components/layout/top-bar"
import { SettingsModal } from "@/components/shared/settings-modal"
import { motion, AnimatePresence } from "framer-motion"

import { ChatModule } from "@/components/chat/chat-module"
import { VisionModule } from "@/components/vision/vision-module"
import { ImageModule } from "@/components/image/image-module"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { MobileHeader } from "@/components/layout/mobile-header"

export default function Home() {
  const { currentModule } = useAppStore()

  return (
    <main className="h-[100dvh] w-full bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Noise/Texture */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <MobileHeader />

      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="hidden md:block">
        <TopBar />
      </div>

      <div className="flex-1 flex flex-col relative z-10 pt-16 pb-24 md:pt-16 md:pb-36 px-4 max-w-5xl mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentModule}
            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {currentModule === 'chat' && <ChatModule />}
            {currentModule === 'vision' && <VisionModule />}
            {currentModule === 'image' && <ImageModule />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-10 left-0 right-0 z-40 hidden md:flex justify-center pointer-events-none">
          <Dock />
      </div>
      
      <div className="fixed bottom-2 left-0 right-0 z-30 hidden md:flex justify-center pointer-events-none">
        <p className="text-[9px] text-muted-foreground/20 uppercase tracking-[0.2em] font-bold">
          Powered by ModelScope Inference API
        </p>
      </div>

      <MobileNav />
      <SettingsModal />
    </main>
  )
}