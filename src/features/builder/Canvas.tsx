import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ElementView } from '@/components/elements/ElementView';
import { Button } from '@/components/ui/button';
import { ZOOM_MAX, ZOOM_MIN } from '@/lib/constants';
import { displayHeight, rectOf, rectsIntersect, screenToDoc, type Rect } from '@/lib/geometry';
import { useDocStore } from '@/store/docStore';
import { clampZoom, useUiStore } from '@/store/uiStore';
import type { DocElement } from '@/types/doc';
import { addElementToPage } from './addToPage';
import { canvasLayout, fitZoom, type Viewport } from './canvasLayout';
import { registerCanvas } from './canvasBridge';
import { SelectionLayer, type LiveGeometry, type SelectionLayerHandle } from './SelectionLayer';
import { isTypingTarget } from './keys';

interface ZoomAnchor {
  docX: number;
  docY: number;
  cx: number;
  cy: number;
}

function isAdditive(event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): boolean {
  return event.shiftKey || event.metaKey || event.ctrlKey;
}

export function Canvas() {
  const doc = useDocStore((s) => s.doc);
  const zoom = useUiStore((s) => s.zoom);
  const fitMode = useUiStore((s) => s.fitMode);
  const editingId = useUiStore((s) => s.editingId);
  const selectedIds = useUiStore((s) => s.selectedIds);
  const { page, elements } = doc;
  const height = displayHeight(doc);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<SelectionLayerHandle>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [live, setLive] = useState<LiveGeometry | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);

  const layout = canvasLayout(viewport, page.width, height, zoom);

  // ---- viewport size ------------------------------------------------------------------------
  useLayoutEffect(() => {
    const node = workspaceRef.current;
    if (!node) return;
    const measure = () => setViewport({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // ---- fit mode -----------------------------------------------------------------------------
  useEffect(() => {
    if (!fitMode || viewport.width === 0) return;
    useUiStore.getState().setZoom(fitZoom(viewport.width, page.width), { fit: true });
  }, [fitMode, viewport.width, page.width]);

  // ---- keep the point under the cursor (or the viewport center) fixed while zooming ----------
  const anchorRef = useRef<ZoomAnchor | null>(null);
  const lastGeometry = useRef({ zoom, offsetX: layout.offsetX, offsetY: layout.offsetY });
  useLayoutEffect(() => {
    const node = workspaceRef.current;
    const previous = lastGeometry.current;
    if (node && previous.zoom !== zoom && !fitMode) {
      const anchor = anchorRef.current ?? {
        cx: viewport.width / 2,
        cy: viewport.height / 2,
        docX: (node.scrollLeft + viewport.width / 2 - previous.offsetX) / previous.zoom,
        docY: (node.scrollTop + viewport.height / 2 - previous.offsetY) / previous.zoom,
      };
      node.scrollLeft = layout.offsetX + anchor.docX * zoom - anchor.cx;
      node.scrollTop = layout.offsetY + anchor.docY * zoom - anchor.cy;
    }
    anchorRef.current = null;
    lastGeometry.current = { zoom, offsetX: layout.offsetX, offsetY: layout.offsetY };
  });

  // ---- Ctrl/Cmd + wheel zoom (needs a non-passive listener to stop the browser zoom) ---------
  useEffect(() => {
    const node = workspaceRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const { zoom: current } = useUiStore.getState();
      const geometry = lastGeometry.current;
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      anchorRef.current = {
        cx,
        cy,
        docX: (node.scrollLeft + cx - geometry.offsetX) / current,
        docY: (node.scrollTop + cy - geometry.offsetY) / current,
      };
      useUiStore.getState().setZoom(clampZoom(current * Math.exp(-event.deltaY * 0.0015)));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  // ---- Space + drag to pan ------------------------------------------------------------------
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceDown(false);
    };
    const blur = () => setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // ---- bridge for the rail, shortcuts, and toolbar ------------------------------------------
  const toDoc = useCallback((client: { x: number; y: number }) => {
    const rect = pageRef.current?.getBoundingClientRect();
    const { zoom: current } = useUiStore.getState();
    return screenToDoc(client, { left: rect?.left ?? 0, top: rect?.top ?? 0 }, current);
  }, []);

  useEffect(() => {
    registerCanvas({
      clientToDoc: toDoc,
      visibleCenter: () => {
        const node = workspaceRef.current;
        const rect = node?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        const point = toDoc({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        const { page: p } = useDocStore.getState().doc;
        const h = displayHeight(useDocStore.getState().doc);
        return {
          x: Math.min(Math.max(point.x, 0), p.width),
          y: Math.min(Math.max(point.y, 0), h),
        };
      },
      reveal: (target) => {
        const node = workspaceRef.current;
        if (!node) return;
        const { zoom: z } = useUiStore.getState();
        const geometry = lastGeometry.current;
        const top = geometry.offsetY + target.y * z;
        const bottom = top + target.height * z;
        if (top < node.scrollTop + 16) node.scrollTop = Math.max(0, top - 64);
        else if (bottom > node.scrollTop + node.clientHeight - 16) {
          node.scrollTop = bottom - node.clientHeight + 64;
        }
      },
    });
    return () => registerCanvas(null);
  }, [toDoc]);

  // ---- pointer: select, marquee, pan --------------------------------------------------------
  const startPan = (event: React.PointerEvent) => {
    const node = workspaceRef.current;
    if (!node) return;
    setPanning(true);
    const start = {
      x: event.clientX,
      y: event.clientY,
      left: node.scrollLeft,
      top: node.scrollTop,
    };
    const move = (e: PointerEvent) => {
      node.scrollLeft = start.left - (e.clientX - start.x);
      node.scrollTop = start.top - (e.clientY - start.y);
    };
    const up = () => {
      setPanning(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startMarquee = (event: React.PointerEvent) => {
    const ui = useUiStore.getState();
    const additive = isAdditive(event);
    const base = additive ? ui.selectedIds : [];
    const origin = toDoc({ x: event.clientX, y: event.clientY });
    const startScreen = { x: event.clientX, y: event.clientY };
    let moved = false;
    const move = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - startScreen.x, e.clientY - startScreen.y) < 4) return;
      moved = true;
      const point = toDoc({ x: e.clientX, y: e.clientY });
      const rect: Rect = {
        x: Math.min(origin.x, point.x),
        y: Math.min(origin.y, point.y),
        width: Math.abs(point.x - origin.x),
        height: Math.abs(point.y - origin.y),
      };
      setMarquee(rect);
      const hit = useDocStore
        .getState()
        .doc.elements.filter((el) => !el.hidden && rectsIntersect(rect, rectOf(el)))
        .map((el) => el.id);
      useUiStore.getState().select([...new Set([...base, ...hit])]);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setMarquee(null);
      if (!moved && !additive) useUiStore.getState().clearSelection();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-canvas-ui]') || target.closest('.moveable-control-box')) return;
    const ui = useUiStore.getState();
    ui.setActiveRail(null);
    if (event.button === 1 || (event.button === 0 && spaceDown)) {
      event.preventDefault();
      startPan(event);
      return;
    }
    if (event.button !== 0) return;
    const node = target.closest<HTMLElement>('[data-element-id]');
    const id = node?.dataset.elementId;
    if (!node || !id) {
      startMarquee(event);
      return;
    }
    if (isAdditive(event)) {
      ui.toggleSelect(id);
      return;
    }
    if (!ui.selectedIds.includes(id)) {
      ui.select([id]);
      // One press-and-drag moves an element that was not selected yet.
      selectionRef.current?.beginDrag(event.nativeEvent, node);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 0) return;
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-element-id]')?.dataset
      .elementId;
    setHoverId(id ?? null);
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = (event.target as HTMLElement).closest<HTMLElement>('[data-element-id]');
    const id = node?.dataset.elementId;
    if (!id) return;
    const el = useDocStore.getState().doc.elements.find((e) => e.id === id);
    if (el && !el.locked && (el.type === 'text' || el.type === 'field')) {
      useUiStore.getState().select([id]);
      useUiStore.getState().setEditingId(id);
    }
  };

  const view = useMemo(
    () =>
      elements.map((el): DocElement =>
        live && live.id === el.id ? ({ ...el, ...live.rect } as DocElement) : el,
      ),
    [elements, live],
  );

  const cursor = panning ? 'grabbing' : spaceDown ? 'grab' : 'default';
  const isEmpty = elements.length === 0;

  return (
    <div
      ref={workspaceRef}
      data-testid="workspace"
      className="relative h-full w-full overflow-auto bg-workspace"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHoverId(null)}
      onDoubleClick={onDoubleClick}
    >
      <div
        data-testid="sizer"
        className="relative"
        style={{ width: layout.sizerWidth, height: layout.sizerHeight }}
      >
        <div
          ref={pageRef}
          data-testid="page"
          style={{
            position: 'absolute',
            left: layout.offsetX,
            top: layout.offsetY,
            width: page.width,
            height,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            background: page.background,
            boxShadow: 'var(--shadow-page)',
          }}
        >
          {view.map((el) => (
            <ElementView key={el.id} el={el} mode="edit" editing={el.id === editingId} />
          ))}
          {hoverId && !selectedIds.includes(hoverId) && !spaceDown && (
            <HoverOutline elements={elements} id={hoverId} zoom={zoom} />
          )}
          {marquee && (
            <div
              style={{
                position: 'absolute',
                left: marquee.x,
                top: marquee.y,
                width: marquee.width,
                height: marquee.height,
                background: 'color-mix(in srgb, var(--selection) 10%, transparent)',
                border: `${1 / zoom}px solid var(--selection)`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {isEmpty && (
          <div
            data-canvas-ui
            className="pointer-events-none absolute flex flex-col items-center justify-center gap-3 text-center"
            style={{
              left: layout.offsetX,
              top: layout.offsetY,
              width: page.width * zoom,
              height: Math.min(height, 844) * zoom,
            }}
          >
            <p className="pointer-events-none m-0 text-base text-muted-foreground">
              Add a field or element from the left
            </p>
            <div className="pointer-events-auto flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => addElementToPage('heading')}>
                Add heading
              </Button>
              <Button variant="secondary" size="sm" onClick={() => addElementToPage('field-text')}>
                Add field
              </Button>
            </div>
          </div>
        )}

        <SelectionLayer
          ref={selectionRef}
          sizerRef={workspaceRef}
          zoom={zoom}
          offsetX={layout.offsetX}
          offsetY={layout.offsetY}
          pageHeight={height}
          disabled={spaceDown || panning}
          onLive={setLive}
        />
      </div>
    </div>
  );
}

function HoverOutline({
  elements,
  id,
  zoom,
}: {
  elements: DocElement[];
  id: string;
  zoom: number;
}) {
  const el = elements.find((e) => e.id === id);
  if (!el || el.hidden) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        outline: `${1 / zoom}px solid var(--selection)`,
        pointerEvents: 'none',
      }}
    />
  );
}

export { ZOOM_MAX, ZOOM_MIN };
