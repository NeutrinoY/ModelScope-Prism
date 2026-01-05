"use client"

import * as React from "react"
import { useAppStore, type Session, type Message, type GeneratedImage } from "@/lib/store"
import { 
  Plus, 
  MessageSquare, 
  Eye, 
  Image as ImageIcon, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Download,
  Menu,
  Clock,
  PanelLeft
} from "lucide-react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose,
  SheetDescription 
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SidebarProps {
  customTrigger?: React.ReactNode
}

export function Sidebar({ customTrigger }: SidebarProps) {
  const { 
    sessions, 
    activeSessionId, 
    setActiveSessionId, 
    createSession, 
    deleteSession, 
    renameSession,
    currentModule 
  } = useAppStore()

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState("")

  const sortedSessions = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt)

  const handleCreate = () => {
    const id = createSession(currentModule)
    setActiveSessionId(id) 
    toast.success(`New ${currentModule} session started`)
  }

  const handleExport = (session: Session) => {
    let content = `# ${session.title}\n\nType: ${session.type}\nCreated: ${new Date(session.updatedAt).toLocaleString()}\n\n---\n\n`

    if (session.type === 'chat' || session.type === 'vision') {
      const messages = (session.data as any).messages as Message[]
      messages.forEach(msg => {
        content += `### ${msg.role.toUpperCase()}\n\n${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}\n\n`
      })
    } else {
      const images = (session.data as any).images as GeneratedImage[]
      images.forEach((img, i) => {
        content += `### Image ${i + 1}\n\n**Prompt**: ${img.prompt}\n**Model**: ${img.model}\n\n![${img.prompt.replace(/[[\]]/g, '')}](${img.url})\n\n`
      })
    }

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.title.replace(/\s+/g, '_')}.md`
    a.click()
    toast.success("Exported to Markdown")
  }

  const startRename = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation()
    setEditingId(session.id)
    setEditTitle(session.title)
  }

  const submitRename = () => {
    if (editingId && editTitle.trim()) {
      renameSession(editingId, editTitle)
      setEditingId(null)
    }
  }

  const handleSessionClick = (session: Session) => {
    setActiveSessionId(session.id)
    if (session.type !== currentModule) {
      useAppStore.getState().setCurrentModule(session.type)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {customTrigger || (
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-4 left-4 z-50 h-10 w-10 rounded-xl bg-background/50 backdrop-blur-md border border-border/50 shadow-sm hover:bg-background/80"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 bg-background/80 backdrop-blur-2xl border-r border-border/50 flex flex-col gap-0">
        <SheetHeader className="p-4 border-b border-border/20 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-lg font-semibold tracking-tight ml-1">History</SheetTitle>
          <SheetDescription className="sr-only">Access your chat and image generation history.</SheetDescription>
          <div className="flex items-center gap-1">
            <Button onClick={handleCreate} size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-muted" title="New Session">
              <Plus className="h-4 w-4" />
            </Button>
            <SheetClose asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-muted" title="Close Sidebar">
                 <PanelLeft className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {sortedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 opacity-30">
                <Clock className="h-8 w-8 mb-2" />
                <p className="text-xs font-medium">No history yet</p>
              </div>
            ) : (
              sortedSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
                    activeSessionId === session.id 
                      ? "bg-primary/10 border border-primary/20 shadow-sm"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border border-border/50",
                  activeSessionId === session.id ? "bg-primary text-primary-foreground border-none" : "bg-muted/30"
                )}>
                  {session.type === 'chat' && <MessageSquare className="h-4 w-4" />}
                  {session.type === 'vision' && <Eye className="h-4 w-4" />}
                  {session.type === 'image' && <ImageIcon className="h-4 w-4" />}
                </div>

                <div className="flex-1 overflow-hidden">
                  {editingId === session.id ? (
                    <input
                      autoFocus
                      className="w-full bg-transparent border-none focus:outline-none text-sm font-medium"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={submitRename}
                      onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                    />
                  ) : (
                    <p className="text-sm font-medium truncate pr-16">{session.title}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-60">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Quick Actions (Floating on hover) */}
                <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-md hover:bg-background/80"
                    onClick={(e) => startRename(e, session)}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-md hover:bg-background/80"
                    onClick={(e) => { e.stopPropagation(); handleExport(session); }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-md hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent onClick={(e) => e.stopPropagation()}>
                      <DialogHeader>
                        <DialogTitle>Delete Session?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete the session "{session.title}".
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                           <Button variant="outline" onClick={(e) => e.stopPropagation()}>Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                           <Button 
                             variant="destructive"
                             onClick={(e) => { 
                                e.stopPropagation()
                                deleteSession(session.id)
                                toast.info("Session deleted")
                             }}
                           >
                             Delete
                           </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border/20 bg-muted/20">
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
            ModelScope Prism v1.0
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
