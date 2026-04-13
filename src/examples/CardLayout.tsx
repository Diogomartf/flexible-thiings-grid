import FlexibleThiingsGrid, { type ItemConfig } from "../../lib/FlexibleThiingsGrid";

const CardCell = ({ gridIndex, position, isMoving }: ItemConfig) => (
  <div
    className={`absolute inset-1 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-2 text-xs text-gray-800 transition-shadow ${
      isMoving ? "shadow-xl" : "shadow-md"
    }`}
  >
    <div className="text-base font-bold mb-1">#{gridIndex}</div>
    <div className="text-[10px] text-gray-500">
      {position.x}, {position.y}
    </div>
  </div>
);

export const CardLayout = () => (
  <FlexibleThiingsGrid
    gridSize={150}
    renderItem={CardCell}
  />
);

export default CardLayout;
