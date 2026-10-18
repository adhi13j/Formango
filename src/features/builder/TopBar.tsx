import { Eye, EyeOff, MoreHorizontal, Redo2, Undo2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStore } from 'zustand';
import { toast } from 'sonner';
import { IconButton } from '@/components/common/IconButton';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { exportJson, importJsonFile } from '@/lib/persistence';
import { temporalStore, useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { FormDoc } from '@/types/doc';
import { redo, undo } from './editorActions';
import { addSampleElements } from './devTools';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import { NewDesignDialog } from './dialogs/NewDesignDialog';
import { formatShortcut } from './shortcuts';

function TitleField() {
  const title = useDocStore((s) => s.doc.title);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) useDocStore.getState().setTitle(draft);
    setDraft(null);
  };
  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(title)}
        aria-label={`Form title: ${title}. Click to rename.`}
        className="max-w-[28ch] truncate rounded-md px-2 py-1 text-base font-medium text-foreground hover:bg-accent"
      >
        {title}
      </button>
    );
  }
  return (
    <input
      autoFocus
      aria-label="Form title"
      maxLength={120}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') setDraft(null);
      }}
      onFocus={(event) => event.target.select()}
      className="h-8 w-64 rounded-md border border-input bg-card px-2 text-base text-foreground"
    />
  );
}

function SaveStatus() {
  const status = useUiStore((s) => s.saveStatus);
  const text = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Not saved' }[status];
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="save-status"
      className="min-w-16 text-sm text-muted-foreground"
    >
      {text}
    </span>
  );
}

export function TopBar() {
  const canUndo = useStore(temporalStore, (s) => s.pastStates.length > 0);
  const canRedo = useStore(temporalStore, (s) => s.futureStates.length > 0);
  const mode = useUiStore((s) => s.mode);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<FormDoc | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await importJsonFile(file);
    if (!result.ok) {
      toast.error(`Could not import that file. ${result.errors[0] ?? ''}`);
      return;
    }
    if (useDocStore.getState().doc.elements.length === 0) applyImport(result.doc);
    else setPendingImport(result.doc);
  };

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      <Logo />
      <TitleField />
      <div className="ml-2 flex items-center gap-1">
        <IconButton
          label="Undo"
          shortcut={formatShortcut('undo')}
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 size={20} strokeWidth={1.75} />
        </IconButton>
        <IconButton
          label="Redo"
          shortcut={formatShortcut('redo')}
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 size={20} strokeWidth={1.75} />
        </IconButton>
      </div>
      <SaveStatus />
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="secondary"
          aria-pressed={mode === 'preview'}
          onClick={() => useUiStore.getState().setMode(mode === 'preview' ? 'edit' : 'preview')}
        >
          {mode === 'preview' ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
          {mode === 'preview' ? 'Exit preview' : 'Preview'}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex rounded-md">
              <Button disabled aria-disabled="true" className="pointer-events-none">
                Publish
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                // Nothing to lose on an empty page, so skip the prompt.
                if (useDocStore.getState().doc.elements.length === 0) {
                  useUiStore.getState().setSizeDialogOpen(true);
                } else {
                  setConfirmNew(true);
                }
              }}
            >
              New design
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportJson(useDocStore.getState().doc)}>
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
              Import JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => useUiStore.getState().setShortcutsOpen(true)}>
              Keyboard shortcuts
            </DropdownMenuItem>
            {import.meta.env.DEV && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => addSampleElements(100)}>
                  Add 100 elements (dev only)
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="import-input"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      <NewDesignDialog
        open={confirmNew}
        onCancel={() => setConfirmNew(false)}
        onContinue={() => {
          setConfirmNew(false);
          useUiStore.getState().setSizeDialogOpen(true);
        }}
      />
      <ConfirmDialog
        open={pendingImport !== null}
        title="Replace your current design?"
        description="The imported design replaces what is on the page. You can undo this right after."
        confirmLabel="Replace"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) applyImport(pendingImport);
          setPendingImport(null);
        }}
      />
    </header>
  );
}

function applyImport(doc: FormDoc): void {
  useDocStore.getState().replaceDoc(doc);
  useUiStore.getState().clearSelection();
  useUiStore.getState().setZoom(1, { fit: true });
  toast.success('Design imported.');
}
