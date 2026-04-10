# ThiingsGrid

A high-performance, infinite scrolling grid component for React that provides smooth touch/mouse interactions with momentum-based scrolling. Perfect for displaying large datasets in a grid format with custom cell renderers.

## 🪩 [**Explore Thiings.co →**](https://thiings.co)

> This is the component that powers the interactive grid on [thiings.co](https://thiings.co/) - A growing collection of 1200+ free 3D icons, generated with AI.

## 🎮 [**Try the Live Playground →**](https://grid.thiings.co)

> Experience ThiingsGrid in action with interactive examples and copy-paste ready code.

## ✨ Features

- 🚀 **High Performance**: Only renders visible cells with optimized viewport calculations
- 📱 **Touch & Mouse Support**: Smooth interactions on both desktop and mobile
- 🎯 **Momentum Scrolling**: Natural physics-based scrolling with inertia
- ♾️ **Infinite Grid**: Supports unlimited grid sizes with efficient rendering
- 🎨 **Custom Renderers**: Flexible cell rendering with your own components
- 🔧 **TypeScript Support**: Full type safety with comprehensive TypeScript definitions
- 📐 **Variable Cell Sizes**: Cells can span multiple columns and/or rows for rich layouts

## 🚀 Quick Start

### Installation

This component is currently part of this repository. To use it in your project:

1. Copy the `lib/ThiingsGrid.tsx` file to your project
2. Install the required dependencies:

```bash
npm install react react-dom
```

### Basic Usage

```tsx
import ThiingsGrid, { type ItemConfig } from './path/to/ThiingsGrid';

const MyCell = ({ gridIndex, position }: ItemConfig) => (
  <div className="absolute inset-1 flex items-center justify-center">
    {gridIndex}
  </div>
);

const App = () => (
  <div style={{ width: '100vw', height: '100vh' }}>
    <ThiingsGrid
      gridSize={80}
      renderItem={MyCell}
    />
  </div>
);
```

## 📚 API Reference

### ThiingsGridProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `gridSize` | `number` | ✅ | - | Size of each grid cell in pixels |
| `renderItem` | `(config: ItemConfig) => ReactNode` | ✅ | - | Function to render each grid cell |
| `className` | `string` | ❌ | - | CSS class name for the container |
| `initialPosition` | `Position` | ❌ | `{ x: 0, y: 0 }` | Initial scroll position |
| `getSpan` | `(position: Position) => CellSpan` | ❌ | `() => ({ colSpan: 1, rowSpan: 1 })` | Returns how many columns and rows a cell at the given grid position should span |

### ItemConfig

The `renderItem` function receives an `ItemConfig` object with:

| Property | Type | Description |
|----------|------|-------------|
| `gridIndex` | `number` | Unique index for the grid cell |
| `position` | `Position` | Grid coordinates `{ x: number, y: number }` |
| `isMoving` | `boolean` | Whether the grid is currently being moved/scrolled |
| `colSpan` | `number` | Number of columns this cell spans (≥ 1) |
| `rowSpan` | `number` | Number of rows this cell spans (≥ 1) |

### CellSpan

```tsx
type CellSpan = {
  colSpan: number; // columns to span rightward (≥ 1)
  rowSpan: number; // rows to span downward (≥ 1)
};
```

### Position

```tsx
type Position = {
  x: number;
  y: number;
};
```

### Utility Functions

```tsx
import { colSpanForWidth, rowSpanForHeight } from './ThiingsGrid';

// Returns the colSpan that best fits an image of naturalWidth pixels
// within a grid cell of gridSize pixels (uses Math.round)
colSpanForWidth(naturalWidth: number, gridSize: number): number

// Returns the rowSpan that best fits an image of naturalHeight pixels
rowSpanForHeight(naturalHeight: number, gridSize: number): number
```

## 🎨 Examples

### Simple Numbers

```tsx
import ThiingsGrid, { type ItemConfig } from "./ThiingsGrid";

const SimpleNumberCell = ({ gridIndex }: ItemConfig) => (
  <div className="absolute inset-1 flex items-center justify-center bg-blue-50 border border-blue-500 rounded text-sm font-bold text-blue-800">
    {gridIndex}
  </div>
);

export const SimpleNumbers = () => (
  <ThiingsGrid
    gridSize={80}
    renderItem={SimpleNumberCell}
    initialPosition={{ x: 0, y: 0 }}
  />
);
```

### Colorful Grid

```tsx
const ColorfulCell = ({ gridIndex }: ItemConfig) => {
  const colors = [
    "bg-red-300",
    "bg-green-300", 
    "bg-blue-300",
    "bg-yellow-300",
    "bg-pink-300",
    "bg-cyan-300",
  ];
  const colorClass = colors[gridIndex % colors.length];

  return (
    <div className={`absolute inset-0 flex items-center justify-center ${colorClass} text-xs font-bold text-gray-800 shadow-sm`}>
      {gridIndex}
    </div>
  );
};

export const ColorfulGrid = () => (
  <ThiingsGrid gridSize={100} renderItem={ColorfulCell} />
);
```

### Interactive Cards

```tsx
const CardCell = ({ gridIndex, position, isMoving }: ItemConfig) => (
  <div className={`absolute inset-1 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-2 text-xs text-gray-800 transition-shadow ${
    isMoving ? "shadow-xl" : "shadow-md"
  }`}>
    <div className="text-base font-bold mb-1">#{gridIndex}</div>
    <div className="text-[10px] text-gray-500">
      {position.x}, {position.y}
    </div>
  </div>
);

export const CardLayout = () => (
  <ThiingsGrid
    gridSize={150}
    renderItem={CardCell}
  />
);
```

### Variable Cell Sizes

Cells can span multiple columns and/or rows via the `getSpan` prop. Spans grow rightward (+x) and downward (+y) from the anchor cell. Cells covered by a spanning neighbour are automatically suppressed.

```tsx
import ThiingsGrid, {
  type ItemConfig,
  type CellSpan,
  colSpanForWidth,
  rowSpanForHeight,
} from "./ThiingsGrid";

// Pre-compute spans from static image metadata
const GRID_SIZE = 100;
const images = [
  { src: "/img/wide.jpg",   width: 320, height: 180 }, // landscape → 3×2
  { src: "/img/square.jpg", width: 100, height: 100 }, // square    → 1×1
  { src: "/img/tall.jpg",   width: 100, height: 220 }, // portrait  → 1×2
  // ...up to 30 images
];

const SPANS: CellSpan[] = images.map(({ width, height }) => ({
  colSpan: colSpanForWidth(width, GRID_SIZE),
  rowSpan: rowSpanForHeight(height, GRID_SIZE),
}));

const ImageCell = ({ gridIndex, colSpan, rowSpan }: ItemConfig) => {
  const img = images[gridIndex % images.length];
  return (
    <div className="absolute inset-1 overflow-hidden rounded-lg">
      <img
        src={img.src}
        className="w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute bottom-1 right-1 text-[9px] text-white/70">
        {colSpan}×{rowSpan}
      </div>
    </div>
  );
};

export const VariableGrid = () => (
  <ThiingsGrid
    gridSize={GRID_SIZE}
    getSpan={(pos) => {
      const idx = /* your index fn */(pos.x, pos.y) % images.length;
      return SPANS[idx];
    }}
    renderItem={ImageCell}
  />
);
```

#### Span rules

- **Direction**: spans extend rightward (`colSpan`) and downward (`rowSpan`) from the anchor position
- **Conflicts**: if two spans overlap, the top-left anchor (earlier in left-to-right, top-down scan order) wins
- **Max span**: clamped internally to 20 in each direction
- **Default**: when `getSpan` is omitted, all cells are 1×1 — identical behaviour to before

## 🎯 Best Practices

### Cell Positioning

Always use absolute positioning within your cell components for optimal performance:

```tsx
// ✅ Good
const MyCell = ({ gridIndex }: ItemConfig) => (
  <div className="absolute inset-1 ...">
    {gridIndex}
  </div>
);

// ❌ Avoid - can cause layout issues
const MyCell = ({ gridIndex }: ItemConfig) => (
  <div className="w-full h-full ...">
    {gridIndex}
  </div>
);
```

### Performance Optimization

For better performance with complex cells:

```tsx
const OptimizedCell = React.memo(({ gridIndex, isMoving }: ItemConfig) => {
  // Expensive calculations here
  const computedValue = useMemo(() => {
    return expensiveCalculation(gridIndex);
  }, [gridIndex]);

  return (
    <div className="absolute inset-1 ...">
      {computedValue}
    </div>
  );
});
```

### Container Setup

Ensure the ThiingsGrid has a defined container size:

```tsx
// ✅ Good - explicit container size
<div style={{ width: '100vw', height: '100vh' }}>
  <ThiingsGrid gridSize={80} renderItem={MyCell} />
</div>

// ✅ Good - CSS classes with defined dimensions
<div className="w-screen h-screen">
  <ThiingsGrid gridSize={80} renderItem={MyCell} />
</div>
```

## 🔧 Advanced Usage

### Custom Grid Index Calculation

The `gridIndex` is calculated based on the grid position using a custom algorithm that provides unique indices for each cell position.

### Accessing Grid Position

You can access the current grid position programmatically:

```tsx
const MyComponent = () => {
  const gridRef = useRef<ThiingsGrid>(null);

  const getCurrentPosition = () => {
    if (gridRef.current) {
      const position = gridRef.current.publicGetCurrentPosition();
      console.log('Current position:', position);
    }
  };

  return (
    <ThiingsGrid
      ref={gridRef}
      gridSize={80}
      renderItem={MyCell}
    />
  );
};
```

### Responsive Grid Sizes

```tsx
const useResponsiveGridSize = () => {
  const [gridSize, setGridSize] = useState(80);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setGridSize(60); // Smaller on mobile
      } else if (width < 1024) {
        setGridSize(80); // Medium on tablet
      } else {
        setGridSize(100); // Larger on desktop
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return gridSize;
};

const ResponsiveGrid = () => {
  const gridSize = useResponsiveGridSize();
  
  return (
    <ThiingsGrid
      gridSize={gridSize}
      renderItem={MyCell}
    />
  );
};
```

## 🎮 Interaction

### Touch/Mouse Events

The component handles:
- **Mouse**: Click and drag to pan
- **Touch**: Touch and drag to pan
- **Wheel**: Scroll wheel for precise movements
- **Momentum**: Automatic momentum scrolling with physics

## 🔍 Development

### Running the Demo

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── examples/           # Example implementations
│   ├── SimpleNumbers.tsx
│   ├── ColorfulGrid.tsx
│   ├── EmojiFun.tsx
│   └── CardLayout.tsx
├── App.tsx            # Main demo application
├── Playground.tsx     # Example viewer
├── SourceCode.tsx     # Source code display
└── Sidebar.tsx        # Example navigation

lib/
└── ThiingsGrid.tsx    # Main component
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React and TypeScript
- Styled with Tailwind CSS
- Bundled with Vite
