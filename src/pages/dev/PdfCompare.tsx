import { useEffect, useRef, useState } from 'react';
import { ElementView } from '@/components/elements/ElementView';
import type { AnswerValue } from '@/components/elements/types';
import { loadFonts, fontsUsedBy } from '@/lib/fonts';
import { displayHeight } from '@/lib/geometry';
import { inputTop } from '@/lib/fields';
import { exportPdf } from '@/pdf/exportPdf';
import { pdfGeometry } from '@/pdf/units';
import { TEMPLATES } from '@/templates';
import type { Answers, FieldElement, FormDoc } from '@/types/doc';
import { kitchenSink } from './kitchenSink';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

declare global {
  interface Window {
    __compare?: {
      width: number;
      height: number;
      ignore: Rect[];
      warnings: string[];
      bytes: number;
    };
  }
}

function sampleSignature(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.strokeStyle = '#2A1805';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 40);
    ctx.bezierCurveTo(40, 0, 70, 70, 100, 20);
    ctx.bezierCurveTo(130, 60, 160, 0, 190, 30);
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

function sampleAnswers(doc: FormDoc): Answers {
  const answers: Answers = {};
  for (const el of doc.elements) {
    if (el.type !== 'field') continue;
    switch (el.fieldType) {
      case 'text':
        answers[el.id] = el.validation === 'email' ? 'asha@example.com' : 'Asha Rao';
        break;
      case 'longtext':
        answers[el.id] = 'A short message that wraps onto a second line, then a third.';
        break;
      case 'dropdown':
      case 'radio':
        if (el.options[0]) answers[el.id] = el.options[0];
        break;
      case 'checkbox':
        answers[el.id] = el.options.slice(0, 2);
        break;
      case 'date':
        answers[el.id] = '2026-03-14';
        break;
      case 'signature':
        answers[el.id] = sampleSignature();
        break;
      case 'file':
        answers[el.id] = 'cv.pdf';
        break;
    }
  }
  return answers;
}

/**
 * Parts of a field the screen and the PDF draw differently on purpose (native date format,
 * browser text wrapping, signature pad chrome, placeholders). The comparison skips them.
 */
function ignoredAreas(doc: FormDoc, filled: boolean): Rect[] {
  const areas: Rect[] = [];
  for (const el of doc.elements) {
    if (el.type === 'button') areas.push({ x: el.x, y: el.y, width: el.width, height: el.height });
    if (el.type !== 'field') continue;
    const top = inputTop(el.labelStyle.fontSize);
    const box = { x: el.x, y: el.y + top, width: el.width, height: el.height - top };
    const sw = el.inputStyle.strokeWidth;
    const interior = {
      x: box.x + sw,
      y: box.y + sw,
      width: box.width - sw * 2,
      height: box.height - sw * 2,
    };
    const special = ['date', 'longtext', 'signature', 'file'].includes(el.fieldType);
    if (special) areas.push(box);
    else if (el.fieldType === 'text' || el.fieldType === 'dropdown') {
      // Blank: placeholders only exist on screen. Filled: the screen draws a green border.
      areas.push(
        filled ? { x: box.x - 1, y: box.y - 1, width: box.width + 2, height: sw + 2 } : interior,
      );
      if (filled) {
        areas.push({
          x: box.x - 1,
          y: box.y + box.height - sw - 1,
          width: box.width + 2,
          height: sw + 2,
        });
        areas.push({ x: box.x - 1, y: box.y - 1, width: sw + 2, height: box.height + 2 });
        areas.push({
          x: box.x + box.width - sw - 1,
          y: box.y - 1,
          width: sw + 2,
          height: box.height + 2,
        });
      }
    } else if (filled) {
      // Checked marks turn green on screen.
      areas.push({ x: el.x - 1, y: el.y + top, width: 18, height: el.height - top });
    }
  }
  return areas;
}

export default function PdfCompare() {
  const params = new URLSearchParams(window.location.search);
  const docName = params.get('doc') ?? 'kitchen-sink-mobile';
  const filled = params.get('filled') === '1';
  const [ready, setReady] = useState(false);
  // Text is laid out with real font widths, so nothing is drawn before the fonts are in.
  const [fontsReady, setFontsReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc] = useState<FormDoc | null>(() => {
    if (docName === 'kitchen-sink-mobile') return kitchenSink('mobile');
    if (docName === 'kitchen-sink-a4') return kitchenSink('a4');
    return TEMPLATES.find((t) => t.id === docName)?.doc ?? null;
  });
  const [answers] = useState<Record<string, AnswerValue>>(() =>
    doc && filled ? sampleAnswers(doc) : {},
  );

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    void (async () => {
      await loadFonts(fontsUsedBy(doc));
      setFontsReady(true);
      const result = await exportPdf(doc, filled ? answers : null, { mode: 'filled' });
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      const pdf = await pdfjs.getDocument({ data: result.bytes.slice() }).promise;
      const page = await pdf.getPage(1);
      const g = pdfGeometry(doc);
      const viewport = page.getViewport({ scale: 1 / g.scale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
      window.__compare = {
        width: doc.page.width,
        height: Math.round(displayHeight(doc)),
        ignore: ignoredAreas(doc, filled),
        warnings: result.warnings,
        bytes: result.bytes.length,
      };
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, filled, answers]);

  if (!doc) return <p>Unknown doc "{docName}"</p>;
  const height = Math.round(displayHeight(doc));
  return (
    <main
      data-ready={ready ? 'yes' : 'no'}
      style={{
        display: 'flex',
        gap: 24,
        padding: 16,
        background: '#ddd',
        alignItems: 'flex-start',
      }}
    >
      <div
        data-testid="dom-page"
        style={{
          position: 'relative',
          width: doc.page.width,
          height,
          background: doc.page.background,
          flex: 'none',
          overflow: 'hidden',
        }}
      >
        {(fontsReady ? doc.elements : []).map((el) => (
          <ElementView
            key={el.id}
            el={el}
            mode="fill"
            value={el.type === 'field' ? answers[el.id] : undefined}
          />
        ))}
      </div>
      <canvas
        data-testid="pdf-page"
        ref={canvasRef}
        style={{ flex: 'none', background: 'white' }}
      />
    </main>
  );
}

export type { FieldElement };
