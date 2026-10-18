import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/authContext';
import { LoginCard } from '@/features/auth/LoginCard';
import { PRESET_HEIGHT, PresetCard } from '@/features/landing/PresetCard';
import { PresetPreview } from '@/features/landing/PresetPreview';
import { loadAllFonts } from '@/lib/fonts';
import { usePageMeta } from '@/lib/usePageMeta';
import { TEMPLATES, type Template } from '@/templates';

const COLUMN_ONE = TEMPLATES.filter((_, index) => index % 2 === 0);
const COLUMN_TWO = TEMPLATES.filter((_, index) => index % 2 === 1);

/** A column that drifts upward. Its list is drawn twice so the loop has no seam. */
function PresetColumn({
  templates,
  className,
  offset,
  onOpen,
}: {
  templates: Template[];
  className: string;
  offset: number;
  onOpen: (template: Template) => void;
}) {
  return (
    <div className="overflow-hidden" style={{ height: '100%', paddingTop: offset }}>
      <div className={`preset-track flex flex-col gap-5 ${className}`}>
        {[false, true].flatMap((decorative) =>
          templates.map((template) => (
            <PresetCard
              key={`${template.id}-${decorative}`}
              template={template}
              onOpen={onOpen}
              decorative={decorative}
            />
          )),
        )}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fontsReady, setFontsReady] = useState(false);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  usePageMeta('Formango: design forms, fill them anywhere, get a PDF');

  useEffect(() => {
    void loadAllFonts().then(() => setFontsReady(true));
  }, []);

  if (!loading && user) return <Navigate to="/forms" replace />;

  const useTemplate = (template: Template) => {
    navigate(`/login?redirectTo=${encodeURIComponent(`/forms?template=${template.id}`)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-6 border-b border-border bg-card px-4">
        <Logo />
        <a href="#presets" className="text-sm font-medium text-foreground">
          Presets
        </a>
        <Button asChild variant="secondary" size="sm" className="ml-auto">
          <Link to="/login">Log in / Sign up</Link>
        </Button>
      </header>

      <main className="grid flex-1 lg:grid-cols-[62fr_38fr]">
        <section
          id="presets"
          aria-label="Preset forms"
          className="preset-panel relative order-2 overflow-hidden bg-gradient-to-br from-mango-500 to-mango-600 lg:order-1 lg:[clip-path:polygon(0_0,100%_0,92%_100%,0_100%)]"
        >
          {fontsReady && (
            <div
              className="relative hidden h-[calc(100vh-56px)] gap-6 px-10 lg:flex lg:justify-center"
              style={{ minHeight: 520 }}
            >
              <PresetColumn
                templates={COLUMN_ONE}
                className="is-slow"
                offset={0}
                onOpen={setPreviewing}
              />
              <PresetColumn
                templates={COLUMN_TWO}
                className="is-reverse"
                offset={PRESET_HEIGHT / 4}
                onOpen={setPreviewing}
              />
            </div>
          )}
          {fontsReady && (
            <div className="flex gap-4 overflow-x-auto px-6 pb-6 lg:hidden" aria-label="Presets">
              {TEMPLATES.map((template) => (
                <div key={template.id} className="flex-none">
                  <PresetCard template={template} onOpen={setPreviewing} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="order-1 flex flex-col items-center justify-center gap-6 p-6 lg:order-2">
          <div className="w-full max-w-sm text-foreground">
            <h1 className="m-0 text-3xl font-bold leading-tight">Design a form like a document.</h1>
            <p className="mb-0 mt-3 text-base text-muted-foreground">
              Drag it together, share a link, and people fill it in on their phone. Everyone can
              download a PDF that looks just like your design.
            </p>
          </div>
          <LoginCard redirectTo={null} />
        </section>
      </main>

      <footer className="border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
        <Link to="/privacy">Privacy</Link>
        {' · '}
        <Link to="/builder">Try the builder</Link>
      </footer>

      <PresetPreview
        template={previewing}
        onClose={() => setPreviewing(null)}
        onUse={useTemplate}
      />
    </div>
  );
}
