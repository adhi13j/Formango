import { RotateCcw, Smartphone, Monitor, X } from 'lucide-react';
import { useState } from 'react';
import type { AnswerValue } from '@/components/elements/types';
import { Button } from '@/components/ui/button';
import { FormView } from '@/features/fill/FormView';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';

/** Slim bar shown in place of the toolbar while previewing. */
export function PreviewBar({ onReset }: { onReset: () => void }) {
  const device = useUiStore((s) => s.previewDevice);
  const setDevice = useUiStore((s) => s.setPreviewDevice);
  return (
    <div className="flex h-12 items-center gap-3 border-b border-border bg-card px-4">
      <div role="group" aria-label="Preview device" className="flex rounded-lg bg-muted p-0.5">
        {(['desktop', 'phone'] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={device === value ? 'default' : 'ghost'}
            aria-pressed={device === value}
            onClick={() => setDevice(value)}
          >
            {value === 'desktop' ? (
              <Monitor size={16} aria-hidden="true" />
            ) : (
              <Smartphone size={16} aria-hidden="true" />
            )}
            {value === 'desktop' ? 'Desktop' : 'Phone'}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        Reset answers
      </Button>
      <p className="m-0 ml-auto text-sm text-muted-foreground">Preview only. Nothing is saved.</p>
      <Button variant="secondary" size="sm" onClick={() => useUiStore.getState().setMode('edit')}>
        <X size={16} aria-hidden="true" />
        Exit preview
      </Button>
    </div>
  );
}

export function usePreviewAnswers() {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const onAnswer = (id: string, value: AnswerValue | undefined) =>
    setAnswers((current) => {
      const next = { ...current };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
  return { answers, onAnswer, reset: () => setAnswers({}) };
}

export function PreviewView({
  answers,
  onAnswer,
}: {
  answers: Record<string, AnswerValue>;
  onAnswer: (id: string, value: AnswerValue | undefined) => void;
}) {
  const doc = useDocStore((s) => s.doc);
  const device = useUiStore((s) => s.previewDevice);
  if (device === 'phone') {
    return (
      <div className="flex h-full justify-center overflow-auto bg-workspace p-6">
        <div
          data-testid="phone-frame"
          className="h-full max-h-[844px] w-[390px] flex-none overflow-hidden rounded-[32px] border-8 border-ink-900 bg-card shadow-lg"
        >
          <FormView doc={doc} mode="preview" answers={answers} onAnswer={onAnswer} />
        </div>
      </div>
    );
  }
  return <FormView doc={doc} mode="preview" answers={answers} onAnswer={onAnswer} />;
}
