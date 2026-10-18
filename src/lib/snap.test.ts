import { describe, expect, it } from 'vitest';
import { createElement } from '@/lib/elements';
import { buildSnapLines, gridColumns, snapMove, snapResize } from '@/lib/snap';
import { createBlankDoc } from '@/types/doc.schema';

const lines = { xs: [0, 100, 200], ys: [0, 50] };

describe('snapMove', () => {
  it('snaps the nearest edge or center within the threshold', () => {
    // left edge at 97 is 3px from the line at 100
    expect(snapMove({ x: 97, y: 300, width: 40, height: 10 }, lines, 6)).toMatchObject({
      dx: 3,
      dy: 0,
      guideXs: [100],
    });
    // center at 198 (x 178 + 40/2) is 2px from 200
    expect(snapMove({ x: 178, y: 300, width: 40, height: 10 }, lines, 6).dx).toBe(2);
    // right edge at 203 is 3px past 200
    expect(snapMove({ x: 163, y: 300, width: 40, height: 10 }, lines, 6).dx).toBe(-3);
  });

  it('does nothing outside the threshold', () => {
    expect(snapMove({ x: 60, y: 300, width: 30, height: 10 }, lines, 6)).toMatchObject({
      dx: 0,
      dy: 0,
      guideXs: [],
      guideYs: [],
    });
  });

  it('snaps both axes independently', () => {
    expect(snapMove({ x: 103, y: 47, width: 10, height: 2 }, lines, 6)).toMatchObject({
      dx: -3,
      dy: 1,
    });
  });

  it('reports every line the snapped rect sits on', () => {
    // left edge snaps to 100 and right edge (x + 100) is then on 200
    expect(snapMove({ x: 98, y: 300, width: 100, height: 10 }, lines, 6).guideXs.sort()).toEqual([
      100, 200,
    ]);
  });

  it('scales the threshold with zoom when the caller divides by zoom', () => {
    const rect = { x: 94, y: 300, width: 0, height: 10 };
    expect(snapMove(rect, lines, 6 / 1).dx).toBe(6);
    expect(snapMove(rect, lines, 6 / 2).dx).toBe(0); // at 200% zoom the threshold is 3 doc px
  });
});

describe('snapResize', () => {
  it('snaps only the edge the handle moves', () => {
    const rect = { x: 10, y: 10, width: 91, height: 20 };
    expect(snapResize(rect, [1, 0], lines, 6)).toMatchObject({ dx: -1, dy: 0, guideXs: [100] });
    expect(snapResize(rect, [-1, 0], lines, 6)).toMatchObject({ dx: 0, guideXs: [] });
  });

  it('snaps the bottom edge for a south handle', () => {
    expect(snapResize({ x: 0, y: 0, width: 10, height: 48 }, [0, 1], lines, 6)).toMatchObject({
      dy: 2,
      guideYs: [50],
    });
  });
});

describe('buildSnapLines', () => {
  it('includes page edges, center, margins, and grid columns when enabled', () => {
    const doc = createBlankDoc('mobile');
    const withGrid = buildSnapLines(doc, new Set(), true);
    expect(withGrid.xs).toEqual(expect.arrayContaining([0, 195, 390, 20, 370, 190, 200]));
    const noGrid = buildSnapLines(doc, new Set(), false);
    expect(noGrid.xs).not.toContain(190);
  });

  it('has no bottom or middle lines on auto-height pages but does on A4', () => {
    expect(buildSnapLines(createBlankDoc('mobile'), new Set(), false).ys).toEqual([0, 20]);
    expect(buildSnapLines(createBlankDoc('a4'), new Set(), false).ys).toEqual(
      expect.arrayContaining([561.5, 1123]),
    );
  });

  it("adds other elements' edges and centers, skipping hidden and excluded ones", () => {
    const doc = createBlankDoc('mobile');
    const a = { ...createElement('rect', doc), id: 'a', x: 50, y: 60, width: 100, height: 40 };
    const b = {
      ...createElement('rect', doc),
      id: 'b',
      x: 300,
      y: 300,
      width: 10,
      height: 10,
      hidden: true,
    };
    doc.elements.push(a, b);
    const result = buildSnapLines(doc, new Set(), false);
    expect(result.xs).toEqual(expect.arrayContaining([50, 100, 150]));
    expect(result.xs).not.toContain(300);
    expect(buildSnapLines(doc, new Set(['a']), false).xs).not.toContain(100);
  });
});

describe('gridColumns', () => {
  it('has the mobile one and two column layout', () => {
    expect(gridColumns(createBlankDoc('mobile'))).toEqual([
      [20, 370],
      [20, 190],
      [200, 370],
    ]);
  });
  it('has 12 whole-pixel columns on A4', () => {
    const columns = gridColumns(createBlankDoc('a4'));
    expect(columns).toHaveLength(12);
    expect(columns[0]).toEqual([40, 94]);
    expect(columns[11]?.[1]).toBe(754);
  });
});
