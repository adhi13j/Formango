import { Lock } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { flushSync } from 'react-dom';
import Moveable, {
  type OnDrag,
  type OnDragEnd,
  type OnDragGroup,
  type OnDragGroupEnd,
  type OnDragStart,
  type OnResize,
  type OnResizeEnd,
  type OnResizeStart,
} from 'react-moveable';
import { SNAP_THRESHOLD_PX } from '@/lib/constants';
import { clampToPage, unionRect, type Rect } from '@/lib/geometry';
import { minSizeOf, normalizeElement } from '@/lib/normalize';
import { buildSnapLines, snapMove, snapResize, type SnapLines } from '@/lib/snap';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { DocElement } from '@/types/doc';

export interface LiveGeometry {
  id: string;
  rect: Rect;
}

export interface SelectionLayerHandle {
  /** Starts dragging `node` from the pointer press that just selected it. */
  beginDrag: (event: PointerEvent, node: HTMLElement) => void;
}

interface SelectionLayerProps {
  sizerRef: RefObject<HTMLElement | null>;
  zoom: number;
  offsetX: number;
  offsetY: number;
  pageHeight: number;
  disabled: boolean;
  onLive: (live: LiveGeometry | null) => void;
}

interface Gesture {
  starts: Map<string, DocElement>;
  union: Rect;
  lines: SnapLines;
}

const ALL_DIRECTIONS = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
const WIDTH_ONLY = ['w', 'e'];

function directionsFor(el: DocElement): string[] {
  if (el.type === 'text' && el.autoHeight) return WIDTH_ONLY;
  if (el.type === 'line') return WIDTH_ONLY;
  if (el.type === 'field' && (el.fieldType === 'radio' || el.fieldType === 'checkbox')) {
    return WIDTH_ONLY;
  }
  return ALL_DIRECTIONS;
}

const sameList = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

export const SelectionLayer = forwardRef<SelectionLayerHandle, SelectionLayerProps>(
  function SelectionLayer({ sizerRef, zoom, offsetX, offsetY, pageHeight, disabled, onLive }, ref) {
    const selectedIds = useUiStore((s) => s.selectedIds);
    const editingId = useUiStore((s) => s.editingId);
    const elements = useDocStore((s) => s.doc.elements);
    const page = useDocStore((s) => s.doc.page);

    const selected = useMemo(
      () => elements.filter((el) => selectedIds.includes(el.id) && !el.hidden),
      [elements, selectedIds],
    );
    const canTransform =
      selected.length > 0 && selected.every((el) => !el.locked) && !editingId && !disabled;

    const rootRef = useRef<HTMLDivElement>(null);
    const moveableRef = useRef<Moveable>(null);
    const [targets, setTargets] = useState<HTMLElement[]>([]);
    const [guides, setGuides] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });
    const [badge, setBadge] = useState<{ x: number; y: number; text: string } | null>(null);
    const [keepRatio, setKeepRatio] = useState(false);
    const [shiftDown, setShiftDown] = useState(false);

    const gesture = useRef<Gesture | null>(null);
    const altRef = useRef(false);
    const translate = useRef<[number, number]>([0, 0]);
    const liveRect = useRef<Rect | null>(null);
    const frame = useRef(0);

    // Alt turns snapping off while held. Shift locks the ratio of shapes and images.
    useEffect(() => {
      const sync = (event: KeyboardEvent) => {
        altRef.current = event.altKey;
        setShiftDown(event.shiftKey);
      };
      window.addEventListener('keydown', sync);
      window.addEventListener('keyup', sync);
      return () => {
        window.removeEventListener('keydown', sync);
        window.removeEventListener('keyup', sync);
      };
    }, []);

    // Find the DOM nodes of the selected elements after each render.
    useLayoutEffect(() => {
      const scope = sizerRef.current;
      const nodes = scope
        ? selected.flatMap((el) => {
            const node = scope.querySelector<HTMLElement>(`[data-element-id="${el.id}"]`);
            return node ? [node] : [];
          })
        : [];
      setTargets((current) =>
        current.length === nodes.length && current.every((node, i) => node === nodes[i])
          ? current
          : nodes,
      );
    }, [selected, sizerRef]);

    // Moveable measures the DOM, so tell it when the page moved or an element changed.
    useLayoutEffect(() => {
      moveableRef.current?.updateRect();
    }, [zoom, offsetX, offsetY, elements, targets]);

    const snapActive = () => useUiStore.getState().snapEnabled && !altRef.current;
    const threshold = SNAP_THRESHOLD_PX / zoom;

    const begin = (ids: string[]): Gesture | null => {
      const doc = useDocStore.getState().doc;
      const starts = new Map<string, DocElement>();
      for (const el of doc.elements) if (ids.includes(el.id)) starts.set(el.id, el);
      const union = unionRect([...starts.values()]);
      if (!union) return null;
      const lines = buildSnapLines(doc, new Set(ids), useUiStore.getState().gridEnabled);
      return { starts, union, lines };
    };

    const showGuides = (xs: number[], ys: number[]) =>
      setGuides((current) =>
        sameList(current.xs, xs) && sameList(current.ys, ys) ? current : { xs, ys },
      );

    // ---- move --------------------------------------------------------------------------------
    const dragStart = (ids: string[]) => {
      gesture.current = begin(ids);
      translate.current = [0, 0];
    };

    const applyMove = (tx: number, ty: number, nodes: HTMLElement[]) => {
      const g = gesture.current;
      if (!g) return;
      let rect: Rect = { ...g.union, x: g.union.x + tx, y: g.union.y + ty };
      rect = clampToPage(rect, page, pageHeight);
      if (snapActive()) {
        const snapped = snapMove(rect, g.lines, threshold);
        rect = clampToPage(
          { ...rect, x: rect.x + snapped.dx, y: rect.y + snapped.dy },
          page,
          pageHeight,
        );
        showGuides(snapped.guideXs, snapped.guideYs);
      } else {
        showGuides([], []);
      }
      const dx = rect.x - g.union.x;
      const dy = rect.y - g.union.y;
      translate.current = [dx, dy];
      for (const node of nodes) node.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const commitMove = (nodes: HTMLElement[]) => {
      const g = gesture.current;
      gesture.current = null;
      showGuides([], []);
      for (const node of nodes) node.style.transform = '';
      if (!g) return;
      const [dx, dy] = translate.current;
      if (dx === 0 && dy === 0) return;
      useDocStore.getState().updateElements(
        [...g.starts.values()].map((el) => ({
          id: el.id,
          patch: { x: Math.round(el.x + dx), y: Math.round(el.y + dy) },
        })),
      );
    };

    // ---- resize ------------------------------------------------------------------------------
    const flushLive = useCallback(() => {
      frame.current = 0;
      const id = gesture.current ? [...gesture.current.starts.keys()][0] : undefined;
      const rect = liveRect.current;
      if (!id || !rect) return;
      onLive({ id, rect });
      setBadge({
        x: offsetX + (rect.x + rect.width / 2) * zoom,
        y: offsetY + (rect.y + rect.height) * zoom + 10,
        text: `${rect.width} x ${rect.height}`,
      });
    }, [offsetX, offsetY, onLive, zoom]);

    const resizeStart = (event: OnResizeStart, el: DocElement) => {
      gesture.current = begin([el.id]);
      liveRect.current = { x: el.x, y: el.y, width: el.width, height: el.height };
      const min = minSizeOf(el);
      event.setMin([min.width, min.height]);
      const corner = event.direction[0] !== 0 && event.direction[1] !== 0;
      flushSync(() => setKeepRatio(corner));
    };

    const resizeMove = (event: OnResize, el: DocElement) => {
      const g = gesture.current;
      if (!g) return;
      const [tx = 0, ty = 0] = event.drag.beforeTranslate;
      let rect: Rect = { x: el.x + tx, y: el.y + ty, width: event.width, height: event.height };
      const direction: [number, number] = [event.direction[0] ?? 0, event.direction[1] ?? 0];
      const ratioLocked =
        event.direction[0] !== 0 && event.direction[1] !== 0 && (el.type === 'image' || shiftDown);
      if (snapActive() && !ratioLocked) {
        const snapped = snapResize(rect, direction, g.lines, threshold);
        rect = {
          x: direction[0] < 0 ? rect.x + snapped.dx : rect.x,
          y: direction[1] < 0 ? rect.y + snapped.dy : rect.y,
          width: rect.width + (direction[0] > 0 ? snapped.dx : direction[0] < 0 ? -snapped.dx : 0),
          height:
            rect.height + (direction[1] > 0 ? snapped.dy : direction[1] < 0 ? -snapped.dy : 0),
        };
        showGuides(snapped.guideXs, snapped.guideYs);
      } else {
        showGuides([], []);
      }
      const normalized = normalizeElement({ ...el, ...rect } as DocElement, page);
      liveRect.current = {
        x: normalized.x,
        y: normalized.y,
        width: normalized.width,
        height: normalized.height,
      };
      if (!frame.current) frame.current = requestAnimationFrame(flushLive);
    };

    const resizeEnd = (el: DocElement, wasDrag: boolean) => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      const rect = liveRect.current;
      gesture.current = null;
      liveRect.current = null;
      showGuides([], []);
      setBadge(null);
      // Commit before clearing the live override so the element never flashes back.
      if (wasDrag && rect) useDocStore.getState().updateElement(el.id, rect);
      onLive(null);
      flushSync(() => setKeepRatio(false));
    };

    useImperativeHandle(ref, () => ({
      beginDrag: (event, node) => {
        // The press that selected `node` also starts its drag. Locked elements stay put.
        const id = node.dataset.elementId;
        const el = useDocStore.getState().doc.elements.find((e) => e.id === id);
        if (!el || el.locked || disabled) return;
        flushSync(() => setTargets([node]));
        moveableRef.current?.dragStart(event, node);
      },
    }));

    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    const single = selected.length === 1 ? selected[0] : undefined;
    const lockedSelection = selected.filter((el) => el.locked);

    return (
      <div
        ref={rootRef}
        data-canvas-ui
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 5 }}
      >
        {/* Chrome for locked elements: an outline and a lock, no handles. */}
        {lockedSelection.map((el) => (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: offsetX + el.x * zoom,
              top: offsetY + el.y * zoom,
              width: el.width * zoom,
              height: el.height * zoom,
              outline: '2px solid var(--selection)',
            }}
          >
            <span
              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-selection text-white"
              aria-label="Locked"
            >
              <Lock size={12} aria-hidden="true" />
            </span>
          </div>
        ))}

        {/* Snap guides, drawn in the same space as the page. */}
        {guides.xs.map((x) => (
          <div
            key={`gx${x}`}
            style={{
              position: 'absolute',
              left: offsetX + x * zoom - 0.5,
              top: offsetY,
              width: 1,
              height: pageHeight * zoom,
              background: 'var(--guide)',
            }}
          />
        ))}
        {guides.ys.map((y) => (
          <div
            key={`gy${y}`}
            style={{
              position: 'absolute',
              top: offsetY + y * zoom - 0.5,
              left: offsetX,
              height: 1,
              width: page.width * zoom,
              background: 'var(--guide)',
            }}
          />
        ))}

        {badge && (
          <div
            className="absolute -translate-x-1/2 rounded-md bg-selection px-2 py-0.5 text-xs font-medium text-white"
            style={{ left: badge.x, top: badge.y }}
          >
            {badge.text}
          </div>
        )}

        {canTransform && targets.length > 0 && (
          <Moveable
            ref={moveableRef}
            flushSync={flushSync}
            className="fm-moveable"
            container={rootRef.current}
            rootContainer={rootRef.current}
            target={targets.length === 1 ? targets[0] : targets}
            origin={false}
            draggable
            throttleDrag={0}
            resizable={targets.length === 1}
            throttleResize={0}
            keepRatio={
              targets.length === 1 && (shiftDown || (single?.type === 'image' && keepRatio))
            }
            renderDirections={single ? directionsFor(single) : false}
            snappable={false}
            onDragStart={(e: OnDragStart) => {
              const id = (e.target as HTMLElement).dataset.elementId;
              if (id) dragStart([id]);
            }}
            onDrag={(e: OnDrag) =>
              applyMove(e.beforeTranslate[0] ?? 0, e.beforeTranslate[1] ?? 0, [
                e.target as HTMLElement,
              ])
            }
            onDragEnd={(e: OnDragEnd) =>
              e.isDrag ? commitMove([e.target as HTMLElement]) : commitMove([])
            }
            onDragGroupStart={() => dragStart(selected.map((el) => el.id))}
            onDragGroup={(e: OnDragGroup) =>
              applyMove(
                e.beforeTranslate[0] ?? 0,
                e.beforeTranslate[1] ?? 0,
                e.targets as HTMLElement[],
              )
            }
            onDragGroupEnd={(e: OnDragGroupEnd) =>
              e.isDrag ? commitMove(e.targets as HTMLElement[]) : commitMove([])
            }
            onResizeStart={(e: OnResizeStart) => single && resizeStart(e, single)}
            onResize={(e: OnResize) => single && resizeMove(e, single)}
            onResizeEnd={(e: OnResizeEnd) => single && resizeEnd(single, e.isDrag)}
          />
        )}
      </div>
    );
  },
);
