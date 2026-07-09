'use client';

import { DownloadCloud, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PrismExportV1 } from '@/lib/contracts';
import { parseImportFile, serializeExport, usePrismStore, type ImportPreview } from '@/lib/storage';

/**
 * Local data export / import (docs/rebuild/06): export omits the token;
 * import shows a preview, replaces on confirm, and asks the user to
 * re-confirm their token.
 */
export function DataTransferSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    data: PrismExportV1;
    preview: ImportPreview;
  } | null>(null);

  const handleExport = () => {
    const { settings, sessions, activeSessionByWorkspace } = usePrismStore.getState();
    const json = serializeExport({ settings, sessions, activeSessionByWorkspace });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `prism-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Exported local data (token not included).');
  };

  const handleFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const text = await file.text();
    const result = parseImportFile(text);
    if (!result.ok) {
      toast.error(
        result.reason === 'invalid_json'
          ? 'That file is not valid JSON.'
          : 'That file is not a valid Prism export.'
      );
      return;
    }
    setPendingImport({ data: result.data, preview: result.preview });
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    usePrismStore.getState().replaceFromImport(pendingImport.data);
    setPendingImport(null);
    toast.success('Data imported. Please re-confirm your access token.');
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Local data</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-2 text-xs" onClick={handleExport}>
          <DownloadCloud className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="h-3.5 w-3.5" />
          Import
        </Button>
      </div>
      <p className="text-[10px] text-text-muted">
        Export includes sessions and settings. It never includes your access token.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChosen}
      />

      <Dialog open={!!pendingImport} onOpenChange={(open) => !open && setPendingImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace local data?</DialogTitle>
            <DialogDescription>
              Importing replaces all current sessions and settings. Your access token stays
              untouched, but re-confirm it after importing.
            </DialogDescription>
          </DialogHeader>
          {pendingImport && (
            <div className="rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-xs space-y-1 font-mono">
              <p>Exported: {new Date(pendingImport.preview.exportedAt).toLocaleString()}</p>
              <p>Chat sessions: {pendingImport.preview.chatSessions}</p>
              <p>Vision sessions: {pendingImport.preview.visionSessions}</p>
              <p>Image sessions: {pendingImport.preview.imageSessions}</p>
              <p>Generated images: {pendingImport.preview.generatedImages}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmImport}>
              Replace data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
