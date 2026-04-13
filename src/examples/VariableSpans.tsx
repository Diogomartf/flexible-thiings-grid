import FlexibleThiingsGrid, {
  type ItemConfig,
  colSpanForWidth,
  rowSpanForHeight,
} from "../../lib/FlexibleThiingsGrid";

const GRID_SIZE = 100;

// Static "image sizes" — stand-ins for real assets with natural dimensions
const MOCK_SIZES = [
  { w: 100, h: 100 }, // 1×1
  { w: 220, h: 100 }, // 2×1
  { w: 100, h: 220 }, // 1×2
  { w: 320, h: 220 }, // 3×2
  { w: 100, h: 100 }, // 1×1
  { w: 210, h: 100 }, // 2×1
];

const COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#60a5fa",
  "#c084fc",
];

const VariableSpansCell = ({ gridIndex, colSpan, rowSpan }: ItemConfig) => {
  const color = COLORS[gridIndex % COLORS.length];
  return (
    <div
      className="absolute inset-1 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-sm"
      style={{ background: color }}
    >
      <span className="text-lg">{colSpan}×{rowSpan}</span>
      <span className="text-xs opacity-70 mt-1">#{gridIndex}</span>
    </div>
  );
};

const VariableSpans = () => (
  <FlexibleThiingsGrid
    gridSize={GRID_SIZE}
    getSpan={(pos) => {
      const idx = Math.abs(pos.x * 31 + pos.y * 17) % MOCK_SIZES.length;
      const { w, h } = MOCK_SIZES[idx];
      return {
        colSpan: colSpanForWidth(w, GRID_SIZE),
        rowSpan: rowSpanForHeight(h, GRID_SIZE),
      };
    }}
    renderItem={VariableSpansCell}
  />
);

export default VariableSpans;
