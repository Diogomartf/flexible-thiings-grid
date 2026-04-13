---
name: flexible-thiings-grid
description: Build an infinite scrolling grid UI using FlexibleThiingsGrid — a single-file React component with momentum physics, variable cell spans, gap support, and programmatic navigation.
---

# FlexibleThiingsGrid Skill

## Goal

Given a set of display requirements (what to show, how cells should be sized, any layout rules), produce correct, ready-to-use React code built on `FlexibleThiingsGrid`.

## Input

- **task** — what should the grid display (images, cards, numbers, icons…)
- **assets** — list of items with natural dimensions if known (e.g. `{ src, width, height }[]`)
- **gridSize** — base cell size in px (default: 100)
- **gap** — gutter between cells in px (default: 0)
- **spans** — whether cells should vary in size (yes / no / image-driven)
- **navigation** — whether programmatic scroll or position tracking is needed

## Setup

FlexibleThiingsGrid ships as a **single file** — copy it, do not install a package.

```bash
cp lib/FlexibleThiingsGrid.tsx your-project/components/FlexibleThiingsGrid.tsx
```

Peer dependencies: `react`, `react-dom` (already in any React project).

## Key Exports

```typescript
import FlexibleThiingsGrid, {
  type Position,             // { x: number; y: number }
  type CellSpan,             // { colSpan: number; rowSpan: number }
  type ItemConfig,           // passed to renderItem
  type FlexibleThiingsGridProps,
  colSpanForWidth,           // (naturalWidth, gridSize) => number
  rowSpanForHeight,          // (naturalHeight, gridSize) => number
} from "./FlexibleThiingsGrid";
```

`ItemConfig` fields received by every `renderItem` call:

| Field | Type | Description |
|-------|------|-------------|
| `gridIndex` | `number` | Unique spiral index; 0 = centre |
| `position` | `Position` | Grid coordinates (not pixels) |
| `isMoving` | `boolean` | True while grid is scrolling |
| `colSpan` | `number` | Resolved column span (≥ 1) |
| `rowSpan` | `number` | Resolved row span (≥ 1) |

## Rules

- Always use `position: absolute` (or `absolute inset-*`) inside cell components — the container div is already sized to `colSpan * gridSize + gap * (colSpan-1)` × `rowSpan * gridSize + gap * (rowSpan-1)`.
- Pre-compute spans from static data before render — do not derive spans inside `renderItem`.
- `getSpan` must be a stable reference (wrap in `useCallback` or define outside the component) to avoid unnecessary grid recalculations.
- Spans grow **rightward** (+x) and **downward** (+y) from the anchor cell.
- Cells covered by a spanning neighbour are automatically suppressed — do not render placeholders.
- `scrollTo` is cancelled when the user starts dragging. Always check if `ref.current` exists before calling it.
- `gap` is folded into spanning cell widths automatically — do not compensate manually.

## Output

A complete React component file that:
1. Imports `FlexibleThiingsGrid` and any needed types
2. Defines a `renderItem` function with `position: absolute` cell content
3. Optionally defines `getSpan` using `colSpanForWidth` / `rowSpanForHeight`
4. Returns `<FlexibleThiingsGrid ... />` inside a sized container

## Recipes

### Minimal — uniform cells

```tsx
import FlexibleThiingsGrid, { type ItemConfig } from "./FlexibleThiingsGrid";

const Cell = ({ gridIndex }: ItemConfig) => (
  <div className="absolute inset-1 flex items-center justify-center bg-white rounded shadow">
    {gridIndex}
  </div>
);

export default function MyGrid() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <FlexibleThiingsGrid gridSize={100} renderItem={Cell} />
    </div>
  );
}
```

### Variable spans from static image metadata

```tsx
import FlexibleThiingsGrid, {
  type ItemConfig,
  type CellSpan,
  colSpanForWidth,
  rowSpanForHeight,
} from "./FlexibleThiingsGrid";

const GRID_SIZE = 120;

const images = [
  { src: "/img/wide.jpg",   width: 360, height: 120 },
  { src: "/img/square.jpg", width: 120, height: 120 },
  { src: "/img/tall.jpg",   width: 120, height: 240 },
];

// Pre-compute once — stable across renders
const SPANS: CellSpan[] = images.map(({ width, height }) => ({
  colSpan: colSpanForWidth(width, GRID_SIZE),
  rowSpan: rowSpanForHeight(height, GRID_SIZE),
}));

const ImageCell = ({ gridIndex }: ItemConfig) => {
  const img = images[gridIndex % images.length];
  return (
    <img
      src={img.src}
      className="absolute inset-0 w-full h-full object-cover rounded-lg"
      draggable={false}
    />
  );
};

export default function ImageGrid() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <FlexibleThiingsGrid
        gridSize={GRID_SIZE}
        gap={8}
        getSpan={(pos) => {
          const idx = Math.abs(pos.x * 31 + pos.y * 17) % images.length;
          return SPANS[idx];
        }}
        renderItem={ImageCell}
      />
    </div>
  );
}
```

### Programmatic navigation + position tracking

```tsx
import { useRef, useCallback } from "react";
import FlexibleThiingsGrid, { type Position } from "./FlexibleThiingsGrid";

export default function NavigableGrid() {
  const gridRef = useRef<FlexibleThiingsGrid>(null);

  const goHome = () => {
    gridRef.current?.scrollTo({ x: 0, y: 0 }, true); // animated
  };

  const handlePositionChange = useCallback((pos: Position) => {
    console.log("offset:", pos); // px offset from origin
  }, []);

  return (
    <>
      <button onClick={goHome}>Home</button>
      <div style={{ width: "100vw", height: "100vh" }}>
        <FlexibleThiingsGrid
          ref={gridRef}
          gridSize={100}
          onPositionChange={handlePositionChange}
          renderItem={({ gridIndex }) => (
            <div className="absolute inset-1 bg-blue-100 rounded flex items-center justify-center">
              {gridIndex}
            </div>
          )}
        />
      </div>
    </>
  );
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Cell content uses `width/height: 100%` instead of `absolute` | Use `className="absolute inset-0"` or `absolute inset-1` |
| `getSpan` recreated on every render | Move outside component or wrap in `useCallback` |
| Calling `colSpanForWidth` inside `renderItem` | Pre-compute into a lookup array before the component |
| `scrollTo` called without null check | `gridRef.current?.scrollTo(...)` |
| Expecting gap to be added by cell renderer | `gap` is handled by the library — just style within the cell bounds |

## Examples

Working examples live in `src/examples/`:
- `SimpleNumbers.tsx` — uniform numbered cells
- `ColorfulGrid.tsx` — colour-cycling cells
- `CardLayout.tsx` — cards with shadow on scroll
- `VariableSpans.tsx` — mixed 1×1 / 2×1 / 1×2 / 3×2 cells with colSpan labels
