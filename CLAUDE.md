# FlexibleThiingsGrid — Agent Quick-Start

FlexibleThiingsGrid is a single-file React class component (`lib/FlexibleThiingsGrid.tsx`) that renders an infinite, momentum-scrolling grid. Every visible cell is rendered on demand via a `renderItem` prop; cells outside the viewport are never mounted.

---

## Exports

```typescript
// Default export — the component
export default FlexibleThiingsGrid;

// Named type exports
export type Position    = { x: number; y: number };
export type CellSpan   = { colSpan: number; rowSpan: number };
export type ItemConfig = {
  gridIndex: number;   // unique spiral index (0 = centre)
  position:  Position; // grid coordinates, not pixels
  isMoving:  boolean;  // true while the grid is scrolling/dragging
  colSpan:   number;   // resolved column span (≥ 1)
  rowSpan:   number;   // resolved row span (≥ 1)
};
export type FlexibleThiingsGridProps = {
  gridSize:           number;                              // px per cell unit
  renderItem:         (config: ItemConfig) => ReactNode;
  className?:         string;
  initialPosition?:   Position;                            // default { x:0, y:0 }
  getSpan?:           (position: Position) => CellSpan;   // default () => {1,1}
  gap?:               number;                              // px between cells, default 0
  onPositionChange?:  (position: Position) => void;       // fires on every offset change
};

// Utility functions
export function colSpanForWidth(naturalWidth: number, gridSize: number): number;
export function rowSpanForHeight(naturalHeight: number, gridSize: number): number;
```

---

## Minimal usage

```tsx
import FlexibleThiingsGrid, { type ItemConfig } from './lib/FlexibleThiingsGrid';

const Cell = ({ gridIndex }: ItemConfig) => (
  <div className="absolute inset-1 flex items-center justify-center bg-white rounded shadow">
    {gridIndex}
  </div>
);

<FlexibleThiingsGrid gridSize={100} renderItem={Cell} />
```

Always use `position: absolute` (or `inset-*`) inside cells — the container div is already sized to `colSpan * gridSize` × `rowSpan * gridSize`.

---

## Variable cell spans

```tsx
import FlexibleThiingsGrid, { colSpanForWidth, rowSpanForHeight } from './lib/FlexibleThiingsGrid';
import type { ItemConfig, Position, CellSpan } from './lib/FlexibleThiingsGrid';

const GRID_SIZE = 100;

// Pre-computed from static assets — keyed by gridIndex % total
const SPANS: CellSpan[] = imageMeta.map(({ w, h }) => ({
  colSpan: colSpanForWidth(w, GRID_SIZE),
  rowSpan: rowSpanForHeight(h, GRID_SIZE),
}));

<FlexibleThiingsGrid
  gridSize={GRID_SIZE}
  getSpan={(pos: Position) => {
    const idx = getGridIndex(pos.x, pos.y) % SPANS.length;
    return SPANS[idx];
  }}
  renderItem={({ gridIndex, colSpan, rowSpan }: ItemConfig) => (
    <img
      src={images[gridIndex % images.length]}
      className="absolute inset-0 w-full h-full object-cover rounded"
    />
  )}
/>
```

### Span rules
- **Direction**: `colSpan` grows rightward (+x), `rowSpan` grows downward (+y).
- **Covered cells**: positions inside a spanning cell's footprint are automatically suppressed — nothing renders there.
- **Conflict resolution**: the top-left anchor (earlier in left-to-right, top-to-bottom scan) wins.
- **Max span**: clamped internally to 20 in each direction.
- **`colSpanForWidth(w, gridSize)`**: `Math.max(1, Math.round(w / gridSize))` — rounds to nearest, guards against gridSize ≤ 0.

---

## Public methods (via ref)

```tsx
const ref = React.createRef<FlexibleThiingsGrid>();

// Read current pixel offset
ref.current.publicGetCurrentPosition(): Position

// Programmatic navigation — jumps instantly or animates with cubic ease-in-out (600 ms)
ref.current.scrollTo(position: Position, animated?: boolean): void
```

---

## Key internal behaviours to know

| Behaviour | Detail |
|-----------|--------|
| Viewport culling | Only cells in the visible rect + overscan are mounted. Overscan = `max(3, maxObservedSpan - 1)` when `getSpan` is provided; 0 otherwise. |
| `lastGridCenter` cache | `calculateVisiblePositions` is a no-op until the scroll moves by ≥ 1 full cell. Reset it with `this.lastGridCenter = { x: Infinity, y: Infinity }` to force a recalc. |
| `gridIndex` | Assigned via a spiral algorithm: 0 = (0,0), 1 = (1,0), 2 = (1,−1), … Unique per grid coordinate. |
| Momentum | `FRICTION = 0.997` per ms, `VELOCITY_SCALE = 16`. Momentum is frame-rate independent. |
| `getSpan` changes | Detected in `componentDidUpdate`; triggers `maxObservedSpan` reset + forced grid recalc. |
| Pass 1 covered-cell skip | `updateGridItems` Pass 1 checks `coveredSet.has(key)` before calling `getSpan`. Skipping covered positions prevents them from marking additional cells as covered and cascading into layout gaps. |

---

## Examples

Working examples live in `src/examples/`:
- `SimpleNumbers.tsx` — minimal numbered cells
- `ColorfulGrid.tsx` — colour-cycling cells
- `EmojiFun.tsx` — emoji cells
- `CardLayout.tsx` — card-style cells with shadow transition on scroll
- `ThiingsIcons.tsx` — cycling icon images

Register new examples in `src/Playground.tsx` (import component + `?raw` source, push to both arrays).
