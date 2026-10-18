import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { loadAllFonts } from '@/lib/fonts';
import { startStoreSync } from '@/store/sync';
import { useUiStore } from '@/store/uiStore';
import { Banners } from './Banners';
import { BottomBar } from './BottomBar';
import { Canvas } from './Canvas';
import { ChooseSizeDialog } from './dialogs/ChooseSizeDialog';
import { ShortcutsDialog } from './dialogs/ShortcutsDialog';
import { Flyout } from './Flyout';
import { PreviewBar, PreviewView, usePreviewAnswers } from './PreviewView';
import { Rail } from './Rail';
import { SelectionAnnouncer } from './SelectionAnnouncer';
import { ContextualToolbar } from './toolbar/ContextualToolbar';
import { TopBar } from './TopBar';
import { useEditorShortcuts } from './useEditorShortcuts';
import { useMediaQuery } from './useMediaQuery';
import { usePersistence } from './usePersistence';

function SmallScreenMessage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold text-foreground">Open Formango on a larger screen</h1>
      <p className="text-muted-foreground">
        The builder needs a screen at least 1024 pixels wide. You can still preview your form here.
      </p>
      <Button onClick={() => useUiStore.getState().setMode('preview')}>Preview my form</Button>
    </main>
  );
}

function BuilderShell() {
  const { ready } = usePersistence();
  const [fontsReady, setFontsReady] = useState(false);
  const mode = useUiStore((s) => s.mode);
  useEditorShortcuts();
  const preview = usePreviewAnswers();

  useEffect(() => startStoreSync(), []);
  useEffect(() => {
    void loadAllFonts().then(() => setFontsReady(true));
  }, []);

  const loaded = ready && fontsReady;

  return (
    <div className="grid h-screen grid-rows-[auto_auto_minmax(0,1fr)_auto] bg-background">
      <TopBar />
      <Banners />
      {mode === 'edit' ? <ContextualToolbar /> : <PreviewBar onReset={preview.reset} />}
      <div className="flex min-h-0">
        {mode === 'edit' && <Rail />}
        <main className="relative min-w-0 flex-1">
          {loaded ? (
            <ErrorBoundary>
              {mode === 'edit' ? (
                <Canvas />
              ) : (
                <PreviewView answers={preview.answers} onAnswer={preview.onAnswer} />
              )}
            </ErrorBoundary>
          ) : (
            <div
              className="flex h-full items-start justify-center bg-workspace p-20"
              aria-busy="true"
            >
              <Skeleton className="h-[640px] w-[390px] bg-card" />
            </div>
          )}
          {mode === 'edit' && <Flyout />}
        </main>
      </div>
      {mode === 'edit' ? <BottomBar /> : <div />}
      <SelectionAnnouncer />
      <ChooseSizeDialog />
      <ShortcutsDialog />
    </div>
  );
}

export default function BuilderPage() {
  const wide = useMediaQuery('(min-width: 1024px)');
  const mode = useUiStore((s) => s.mode);
  return (
    <TooltipProvider delayDuration={300}>
      <title>Builder | Formango</title>
      {wide || mode === 'preview' ? <BuilderShell /> : <SmallScreenMessage />}
      <Toaster position="bottom-center" richColors={false} />
    </TooltipProvider>
  );
}
