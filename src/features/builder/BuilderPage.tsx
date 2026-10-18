import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { loadAllFonts } from '@/lib/fonts';
import { usePageMeta } from '@/lib/usePageMeta';
import { useDocStore } from '@/store/docStore';
import { startStoreSync } from '@/store/sync';
import { useUiStore } from '@/store/uiStore';
import { Banners } from './Banners';
import { BuilderSourceContext } from './builderSource';
import { useCloudPersistence } from './useCloudPersistence';
import { BottomBar } from './BottomBar';
import { Canvas } from './Canvas';
import { ChooseSizeDialog } from './dialogs/ChooseSizeDialog';
import { ShortcutsDialog } from './dialogs/ShortcutsDialog';
import { Flyout } from './Flyout';
import { PreviewBar, PreviewView } from './PreviewView';
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

function BuilderShell({ ready }: { ready: boolean }) {
  const [fontsReady, setFontsReady] = useState(false);
  const mode = useUiStore((s) => s.mode);
  useEditorShortcuts();
  // Changing the key starts a fresh preview (Reset answers).
  const [previewRun, setPreviewRun] = useState(0);

  useEffect(() => startStoreSync(), []);
  useEffect(() => {
    void loadAllFonts().then(() => setFontsReady(true));
  }, []);

  const loaded = ready && fontsReady;

  return (
    <div className="grid h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)_auto] bg-background">
      <TopBar />
      <Banners />
      {mode === 'edit' ? (
        <ContextualToolbar />
      ) : (
        <PreviewBar onReset={() => setPreviewRun((n) => n + 1)} />
      )}
      <div className="flex min-h-0">
        {mode === 'edit' && <Rail />}
        <main className="relative min-w-0 flex-1">
          {loaded ? (
            <ErrorBoundary>
              {mode === 'edit' ? <Canvas /> : <PreviewView key={previewRun} />}
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

/** The guest builder: the design lives in this browser. */
function GuestBuilder() {
  const { ready } = usePersistence();
  return <BuilderShell ready={ready} />;
}

/** A saved form of a signed-in account. */
function CloudBuilder({ formId }: { formId: string }) {
  const load = useCloudPersistence(formId);
  const title = useDocStore((s) => s.doc.title);
  usePageMeta(load.status === 'ready' ? `${title} · Formango` : 'Formango');
  if (load.status === 'error') {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">We could not open this form</h1>
        <p className="text-muted-foreground">{load.message}</p>
        <Button asChild>
          <Link to="/forms">Back to my forms</Link>
        </Button>
      </main>
    );
  }
  return <BuilderShell ready={load.status === 'ready'} />;
}

/** `/builder` (guest) when called without a form id, `/forms/:id/edit` with one. */
export default function BuilderPage({ formId }: { formId?: string }) {
  const wide = useMediaQuery('(min-width: 1024px)');
  const mode = useUiStore((s) => s.mode);
  const source = useMemo(() => ({ formId: formId ?? null }), [formId]);
  return (
    <TooltipProvider delayDuration={300}>
      <BuilderSourceContext.Provider value={source}>
        {formId === undefined && <title>Builder | Formango</title>}
        {wide || mode === 'preview' ? (
          formId ? (
            <CloudBuilder formId={formId} />
          ) : (
            <GuestBuilder />
          )
        ) : (
          <SmallScreenMessage />
        )}
        <Toaster position="bottom-center" richColors={false} />
      </BuilderSourceContext.Provider>
    </TooltipProvider>
  );
}
