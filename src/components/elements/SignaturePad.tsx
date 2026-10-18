import { Eraser, ImageUp, PenLine, Type } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { loadFonts } from '@/lib/fonts';
import {
  SIGNATURE_INK,
  SIGNATURE_STROKE,
  exportSignature,
  typedSignatureCanvas,
  uploadedSignatureCanvas,
} from '@/lib/signature';
import type { FieldElement } from '@/types/doc';
import { boxStyle } from './boxStyle';
import { fontStack } from './types';

type Tab = 'draw' | 'type' | 'upload';
type Point = { x: number; y: number };

const TABS: { id: Tab; label: string; icon: typeof PenLine }[] = [
  { id: 'draw', label: 'Draw', icon: PenLine },
  { id: 'type', label: 'Type', icon: Type },
  { id: 'upload', label: 'Upload', icon: ImageUp },
];

const smallButton =
  'inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border-0 px-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring';

interface SignaturePadProps {
  el: FieldElement;
  inputId: string;
  value: string | undefined;
  describedBy: string | undefined;
  invalid: boolean;
  onChange: (value: string | undefined) => void;
}

function strokePath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  const [first, second] = points;
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  if (!second) {
    ctx.lineTo(first.x + 0.01, first.y);
  } else {
    // Quadratic curves between midpoints make the line smooth instead of angular.
    for (let i = 1; i < points.length - 1; i += 1) {
      const p = points[i];
      const next = points[i + 1];
      if (p && next) ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    const last = points[points.length - 1];
    if (last) ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
}

/** A signature box with three ways to sign: draw (mouse, finger, trackpad), type, or upload. */
export function SignaturePad({
  el,
  inputId,
  value,
  describedBy,
  invalid,
  onChange,
}: SignaturePadProps) {
  const s = el.inputStyle;
  const [tab, setTab] = useState<Tab>('draw');
  const [typed, setTyped] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const current = useRef<Point[] | null>(null);
  const filled = value !== undefined && !invalid;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = canvas.width / Math.max(1, canvas.clientWidth);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = SIGNATURE_STROKE;
    ctx.strokeStyle = SIGNATURE_INK;
    for (const points of strokes.current) strokePath(ctx, points);
    if (current.current) strokePath(ctx, current.current);
  }, []);

  // Keep the canvas sharp: its pixel size follows its CSS size times the screen's pixel ratio.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw, tab]);

  // "Reset answers" (or Clear) empties the value from outside: forget what was typed (reset while
  // rendering, which React allows for state derived from props) and what was drawn (a ref).
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    if (value === undefined) setTyped('');
  }
  useEffect(() => {
    if (value !== undefined) return;
    strokes.current = [];
    current.current = null;
    redraw();
  }, [value, redraw]);

  const commitDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(exportSignature(canvas) ?? undefined);
  };

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    current.current = [pointFrom(event)];
    setDrawing(true);
    redraw();
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;
    current.current.push(pointFrom(event));
    redraw();
  };
  const endStroke = () => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    setDrawing(false);
    redraw();
    commitDrawing();
  };

  const clear = () => {
    strokes.current = [];
    current.current = null;
    setTyped('');
    setProblem(null);
    redraw();
    onChange(undefined);
  };

  const onType = async (text: string) => {
    setTyped(text);
    setProblem(null);
    if (!text.trim()) return onChange(undefined);
    await loadFonts(['caveat']);
    const canvas = typedSignatureCanvas(text);
    onChange(canvas ? (exportSignature(canvas) ?? undefined) : undefined);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const canvas = await uploadedSignatureCanvas(file);
      setProblem(null);
      onChange(exportSignature(canvas, { crop: false }) ?? undefined);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That image could not be used.');
    }
  };

  const border = boxStyle(s, filled, !filled && !invalid);
  const body: CSSProperties = { position: 'absolute', left: 0, right: 0, top: 32, bottom: 0 };

  return (
    <div
      role="group"
      aria-labelledby={`lbl-${el.id}`}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      style={{ ...border, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          left: 4,
          right: 4,
          top: 4,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={smallButton}
            style={{
              background: tab === id ? 'var(--primary)' : 'transparent',
              color: tab === id ? 'var(--primary-foreground)' : s.textColor,
            }}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {value !== undefined && (
          <button
            type="button"
            onClick={clear}
            className={smallButton}
            style={{ background: 'transparent', color: s.textColor }}
          >
            <Eraser size={14} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {tab === 'draw' && (
        <div style={body}>
          <canvas
            ref={canvasRef}
            id={inputId}
            aria-label="Signature drawing area"
            style={{
              width: '100%',
              height: '100%',
              touchAction: 'none',
              cursor: 'crosshair',
              display: 'block',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
          />
          {value === undefined && !drawing && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.45,
                pointerEvents: 'none',
                fontSize: Math.max(14, s.fontSize - 2),
                fontFamily: fontStack('DM Sans'),
              }}
            >
              Draw your signature here
            </span>
          )}
        </div>
      )}

      {tab === 'type' && (
        <div style={{ ...body, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
          <input
            id={inputId}
            type="text"
            value={typed}
            maxLength={40}
            autoComplete="off"
            aria-label="Type your name to sign"
            placeholder="Type your name"
            onChange={(event) => void onType(event.target.value)}
            style={{
              width: '100%',
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: s.textColor,
              fontFamily: fontStack('Caveat'),
              fontWeight: 700,
              fontSize: 36,
              minWidth: 0,
            }}
          />
        </div>
      )}

      {tab === 'upload' && (
        <div
          style={{
            ...body,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 8,
          }}
        >
          {value ? (
            <img
              src={value}
              alt="Your signature"
              style={{ maxWidth: '60%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : null}
          <label
            className={smallButton}
            style={{
              background: 'var(--secondary)',
              color: 'var(--secondary-foreground)',
              height: 32,
              padding: '0 12px',
              fontSize: 14,
            }}
          >
            <ImageUp size={16} aria-hidden="true" />
            {value ? 'Choose another' : 'Choose an image'}
            <input
              id={inputId}
              type="file"
              className="sr-only"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                void onUpload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      )}

      {problem && (
        <p
          role="alert"
          className="m-0 text-xs text-error"
          style={{ position: 'absolute', left: 8, bottom: 4 }}
        >
          {problem}
        </p>
      )}
    </div>
  );
}
