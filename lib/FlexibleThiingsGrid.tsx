import React, { Component } from "react";

// Grid physics constants
const MIN_VELOCITY = 0.05;
const UPDATE_INTERVAL = 16;
const VELOCITY_HISTORY_SIZE = 5;
const FRICTION = 0.997; // Per-millisecond friction (applied as friction^deltaTime)
const VELOCITY_SCALE = 16; // Scale px/ms velocity to px/frame at 60fps
const SPAN_OVERSCAN = 3; // Extra cells scanned beyond viewport edges for spanning cells

// Custom debounce implementation
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

  const debouncedFn = function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = undefined;
    }, wait);
  };

  debouncedFn.cancel = function () {
    clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  return debouncedFn;
}

// Custom throttle implementation
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {},
) {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
  const { leading = true, trailing = true } = options;

  const throttledFn = function (...args: Parameters<T>) {
    const now = Date.now();

    if (!lastCall && !leading) {
      lastCall = now;
    }

    const remaining = limit - (now - lastCall);

    if (remaining <= 0 || remaining > limit) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
      lastCall = now;
      func(...args);
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        lastCall = leading ? Date.now() : 0;
        timeoutId = undefined;
        func(...args);
      }, remaining);
    }
  };

  throttledFn.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return throttledFn;
}

function getDistance(p1: Position, p2: Position) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Collision-free integer key for grid coordinates within ±100 000 cells — no string allocation.
function cellKey(x: number, y: number): number {
  return (x + 100_000) * 200_001 + (y + 100_000);
}

export type Position = {
  x: number;
  y: number;
};

export type CellSpan = { colSpan: number; rowSpan: number };

type GridItem = {
  position: Position;
  gridIndex: number;
  colSpan: number;
  rowSpan: number;
};

type State = {
  offset: Position;
  isDragging: boolean;
  startPos: Position;
  restPos: Position;
  velocity: Position;
  gridItems: GridItem[];
  isMoving: boolean;
  lastMoveTime: number;
  velocityHistory: Position[];
};

export type ItemConfig = {
  isMoving: boolean;
  position: Position;
  gridIndex: number;
  colSpan: number;
  rowSpan: number;
};

export type FlexibleThiingsGridProps = {
  gridSize: number;
  renderItem: (itemConfig: ItemConfig) => React.ReactNode;
  className?: string;
  initialPosition?: Position;
  getSpan?: (position: Position) => CellSpan;
  gap?: number;
  onPositionChange?: (position: Position) => void;
};

class FlexibleThiingsGrid extends Component<FlexibleThiingsGridProps, State> {
  private containerRef: React.RefObject<HTMLElement | null>;
  private lastPos: Position;
  private animationFrame: number | null;
  private isComponentMounted: boolean;
  private lastUpdateTime: number;
  private debouncedUpdateGridItems: ReturnType<typeof throttle>;
  private cachedWidth: number;
  private cachedHeight: number;
  private lastGridCenter: Position;
  private maxObservedSpan: number;
  private scrollToTarget: Position | null;
  private scrollToStart: Position | null;
  private scrollToStartTime: number;
  private readonly SCROLL_TO_DURATION = 600; // ms

  constructor(props: FlexibleThiingsGridProps) {
    super(props);
    const offset = this.props.initialPosition || { x: 0, y: 0 };
    this.state = {
      offset: { ...offset },
      restPos: { ...offset },
      startPos: { ...offset },
      velocity: { x: 0, y: 0 },
      isDragging: false,
      gridItems: [],
      isMoving: false,
      lastMoveTime: 0,
      velocityHistory: [],
    };
    this.containerRef = React.createRef();
    this.lastPos = { x: 0, y: 0 };
    this.animationFrame = null;
    this.isComponentMounted = false;
    this.lastUpdateTime = 0;
    this.cachedWidth = 0;
    this.cachedHeight = 0;
    this.lastGridCenter = { x: Infinity, y: Infinity };
    this.maxObservedSpan = 1;
    this.scrollToTarget = null;
    this.scrollToStart = null;
    this.scrollToStartTime = 0;
    this.debouncedUpdateGridItems = throttle(
      this.updateGridItems,
      UPDATE_INTERVAL,
      {
        leading: true,
        trailing: true,
      },
    );
  }

  componentDidMount() {
    this.isComponentMounted = true;
    this.cacheContainerSize();
    this.updateGridItems();

    // Add non-passive event listener
    if (this.containerRef.current) {
      this.containerRef.current.addEventListener("wheel", this.handleWheel, {
        passive: false,
      });
      this.containerRef.current.addEventListener(
        "touchmove",
        this.handleTouchMove,
        { passive: false },
      );
    }

    window.addEventListener("resize", this.handleResize);
  }

  componentDidUpdate(prevProps: FlexibleThiingsGridProps, prevState: State) {
    if (prevProps.getSpan !== this.props.getSpan) {
      this.maxObservedSpan = 1; // reset so overscan re-calibrates for new getSpan
      this.lastGridCenter = { x: Infinity, y: Infinity };
      this.updateGridItems();
    }
    if (prevProps.gap !== this.props.gap) {
      this.lastGridCenter = { x: Infinity, y: Infinity };
      this.updateGridItems();
    }
    if (
      this.props.onPositionChange &&
      (prevState.offset.x !== this.state.offset.x ||
        prevState.offset.y !== this.state.offset.y)
    ) {
      this.props.onPositionChange(this.state.offset);
    }
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.debouncedUpdateGridItems.cancel();
    this.debouncedStopMoving.cancel();

    window.removeEventListener("resize", this.handleResize);

    // Remove event listeners
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener("wheel", this.handleWheel);
      this.containerRef.current.removeEventListener(
        "touchmove",
        this.handleTouchMove,
      );
    }
  }

  private cacheContainerSize = () => {
    if (this.containerRef.current) {
      const rect = this.containerRef.current.getBoundingClientRect();
      this.cachedWidth = rect.width;
      this.cachedHeight = rect.height;
    }
  };

  private handleResize = () => {
    this.cacheContainerSize();
    this.lastGridCenter = { x: Infinity, y: Infinity }; // Force grid recalc
    this.updateGridItems();
  };

  public publicGetCurrentPosition = () => {
    return this.state.offset;
  };

  private get effectiveGap(): number {
    return this.props.gap ?? 0;
  }

  private calculateVisiblePositions = (offset: Position = this.state.offset): Position[] | null => {
    const width = this.cachedWidth;
    const height = this.cachedHeight;
    if (width === 0 && height === 0) return null;

    const step = this.props.gridSize + this.effectiveGap;

    // Calculate center position based on offset
    const centerX = -Math.round(offset.x / step);
    const centerY = -Math.round(offset.y / step);

    // Skip recalculation if the grid center hasn't moved to a new cell
    if (
      centerX === this.lastGridCenter.x &&
      centerY === this.lastGridCenter.y
    ) {
      return null; // Signal: no change
    }
    this.lastGridCenter = { x: centerX, y: centerY };

    // Calculate grid cells needed to fill container
    const cellsX = Math.ceil(width / step);
    const cellsY = Math.ceil(height / step);

    const positions: Position[] = [];
    const halfCellsX = Math.ceil(cellsX / 2);
    const halfCellsY = Math.ceil(cellsY / 2);

    // Skip overscan entirely when getSpan is not provided (no spanning cells possible).
    // When getSpan is provided, use at least SPAN_OVERSCAN and grow with observed spans.
    const overscan = this.props.getSpan
      ? Math.max(SPAN_OVERSCAN, this.maxObservedSpan - 1)
      : 0;

    for (
      let y = centerY - halfCellsY - overscan;
      y <= centerY + halfCellsY + overscan;
      y++
    ) {
      for (
        let x = centerX - halfCellsX - overscan;
        x <= centerX + halfCellsX + overscan;
        x++
      ) {
        positions.push({ x, y });
      }
    }

    return positions;
  };

  private getItemIndexForPosition = (x: number, y: number): number => {
    // Special case for center
    if (x === 0 && y === 0) return 0;

    // Determine which layer of the spiral we're in
    const layer = Math.max(Math.abs(x), Math.abs(y));

    // Calculate the size of all inner layers
    const innerLayersSize = Math.pow(2 * layer - 1, 2);

    // Calculate position within current layer
    let positionInLayer = 0;

    if (y === 0 && x === layer) {
      // Starting position (middle right)
      positionInLayer = 0;
    } else if (y < 0 && x === layer) {
      // Right side, bottom half
      positionInLayer = -y;
    } else if (y === -layer && x > -layer) {
      // Bottom side
      positionInLayer = layer + (layer - x);
    } else if (x === -layer && y < layer) {
      // Left side
      positionInLayer = 3 * layer + (layer + y);
    } else if (y === layer && x < layer) {
      // Top side
      positionInLayer = 5 * layer + (layer + x);
    } else {
      // Right side, top half (y > 0 && x === layer)
      positionInLayer = 7 * layer + (layer - y);
    }

    const index = innerLayersSize + positionInLayer;
    return index;
  };

  private getSpanForPosition = (position: Position): CellSpan => {
    if (this.props.getSpan) {
      const span = this.props.getSpan(position);
      return {
        colSpan: Math.min(Math.max(1, Math.floor(span.colSpan)), 20),
        rowSpan: Math.min(Math.max(1, Math.floor(span.rowSpan)), 20),
      };
    }
    return { colSpan: 1, rowSpan: 1 };
  };

  private debouncedStopMoving = debounce(() => {
    this.setState({ isMoving: false, restPos: { ...this.state.offset } });
  }, 200);

  // Pure computation — safe to call with a pre-setState offset (e.g. from handleMove).
  // Returns null when the grid center hasn't moved to a new cell (no rebuild needed).
  private buildGridItems = (offset: Position): { gridItems: GridItem[]; isMoving: boolean } | null => {
    const positions = this.calculateVisiblePositions(offset);
    if (positions === null) return null;

    // Pass 1: resolve spans, build covered-cell set, track max span.
    // Uses integer keys to avoid string allocation on every visible cell.
    const spanCache = new Map<number, CellSpan>();
    const coveredSet = new Set<number>();
    let maxSpanSeen = 1;

    for (const position of positions) {
      const key = cellKey(position.x, position.y);
      if (coveredSet.has(key)) continue; // suppressed by a previous anchor — skip
      const span = this.getSpanForPosition(position);
      spanCache.set(key, span);

      const { colSpan, rowSpan } = span;
      const localMax = Math.max(colSpan, rowSpan);
      if (localMax > maxSpanSeen) maxSpanSeen = localMax;

      if (colSpan === 1 && rowSpan === 1) continue;
      for (let dy = 0; dy < rowSpan; dy++) {
        for (let dx = 0; dx < colSpan; dx++) {
          if (dx === 0 && dy === 0) continue;
          coveredSet.add(cellKey(position.x + dx, position.y + dy));
        }
      }
    }

    if (maxSpanSeen > this.maxObservedSpan) {
      this.maxObservedSpan = maxSpanSeen;
      this.lastGridCenter = { x: Infinity, y: Infinity };
    }

    // Pass 2: build gridItems, skipping covered positions.
    const newItems: GridItem[] = [];
    for (const position of positions) {
      const key = cellKey(position.x, position.y);
      if (coveredSet.has(key)) continue;
      const gridIndex = this.getItemIndexForPosition(position.x, position.y);
      const { colSpan, rowSpan } = spanCache.get(key)!;
      newItems.push({ position, gridIndex, colSpan, rowSpan });
    }

    const distanceFromRest = getDistance(offset, this.state.restPos);
    return { gridItems: newItems, isMoving: distanceFromRest > 5 };
  };

  private updateGridItems = () => {
    if (!this.isComponentMounted) return;

    const result = this.buildGridItems(this.state.offset);
    if (result === null) {
      // Grid center unchanged — no layout rebuild needed. debouncedStopMoving handles
      // the isMoving: false transition; no extra setState required here.
      this.debouncedStopMoving();
      return;
    }

    this.setState(result);
    this.debouncedStopMoving();
  };

  private animate = () => {
    if (!this.isComponentMounted) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;

    if (deltaTime >= UPDATE_INTERVAL) {
      const { velocity } = this.state;
      const speed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y,
      );

      if (speed < MIN_VELOCITY) {
        this.setState({ velocity: { x: 0, y: 0 } });
        return;
      }

      const deceleration = Math.pow(FRICTION, deltaTime);
      const dt = deltaTime / UPDATE_INTERVAL;

      this.setState(
        (prevState) => ({
          offset: {
            x: prevState.offset.x + prevState.velocity.x * dt,
            y: prevState.offset.y + prevState.velocity.y * dt,
          },
          velocity: {
            x: prevState.velocity.x * deceleration,
            y: prevState.velocity.y * deceleration,
          },
        }),
        this.debouncedUpdateGridItems,
      );

      this.lastUpdateTime = currentTime;
    }

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private handleDown = (p: Position) => {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.scrollToTarget = null;
    this.scrollToStart = null;

    this.setState({
      isDragging: true,
      startPos: {
        x: p.x - this.state.offset.x,
        y: p.y - this.state.offset.y,
      },
      velocity: { x: 0, y: 0 },
      velocityHistory: [],
      lastMoveTime: performance.now(),
    });

    this.lastPos = { x: p.x, y: p.y };
  };

  private handleMove = (p: Position) => {
    if (!this.state.isDragging) return;

    const currentTime = performance.now();
    const timeDelta = currentTime - this.state.lastMoveTime;

    const rawVelocity = {
      x: (p.x - this.lastPos.x) / (timeDelta || 1),
      y: (p.y - this.lastPos.y) / (timeDelta || 1),
    };

    const velocityHistory = [...this.state.velocityHistory, rawVelocity];
    if (velocityHistory.length > VELOCITY_HISTORY_SIZE) velocityHistory.shift();

    let totalWeight = 0;
    const smoothedVelocity = velocityHistory.reduce(
      (acc, vel, i) => {
        const weight = Math.pow(2, i);
        totalWeight += weight;
        return { x: acc.x + vel.x * weight, y: acc.y + vel.y * weight };
      },
      { x: 0, y: 0 },
    );
    smoothedVelocity.x /= totalWeight;
    smoothedVelocity.y /= totalWeight;

    const newOffset = {
      x: p.x - this.state.startPos.x,
      y: p.y - this.state.startPos.y,
    };

    // Compute grid items with the new offset before setState — collapses two render
    // cycles (offset update + grid rebuild) into one.
    const gridResult = this.buildGridItems(newOffset);

    this.setState({
      velocity: smoothedVelocity,
      offset: newOffset,
      lastMoveTime: currentTime,
      velocityHistory,
      ...(gridResult ?? {}),
    });

    this.debouncedStopMoving();
    this.lastPos = { x: p.x, y: p.y };
  };

  private handleUp = () => {
    const timeSinceLastMove = performance.now() - this.state.lastMoveTime;
    const velocity =
      timeSinceLastMove > 100
        ? { x: 0, y: 0 }
        : {
            x: this.state.velocity.x * VELOCITY_SCALE,
            y: this.state.velocity.y * VELOCITY_SCALE,
          };

    this.lastUpdateTime = performance.now();
    this.setState({ isDragging: false, velocity });
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  public scrollTo = (position: Position, animated = false): void => {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.scrollToTarget = null;
    this.scrollToStart = null;

    if (!animated) {
      this.setState(
        { offset: { ...position }, velocity: { x: 0, y: 0 } },
        () => {
          this.lastGridCenter = { x: Infinity, y: Infinity };
          this.updateGridItems();
        },
      );
      return;
    }

    this.scrollToTarget = { ...position };
    this.scrollToStart = { ...this.state.offset };
    this.scrollToStartTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.animateScrollTo);
  };

  private animateScrollTo = () => {
    if (!this.scrollToTarget || !this.scrollToStart) return;
    const elapsed = performance.now() - this.scrollToStartTime;
    const t = Math.min(elapsed / this.SCROLL_TO_DURATION, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const offset = {
      x:
        this.scrollToStart.x +
        (this.scrollToTarget.x - this.scrollToStart.x) * ease,
      y:
        this.scrollToStart.y +
        (this.scrollToTarget.y - this.scrollToStart.y) * ease,
    };
    this.setState(
      { offset, velocity: { x: 0, y: 0 } },
      this.debouncedUpdateGridItems,
    );
    if (t < 1) {
      this.animationFrame = requestAnimationFrame(this.animateScrollTo);
    } else {
      this.scrollToTarget = null;
      this.scrollToStart = null;
      this.animationFrame = null;
    }
  };

  private handleMouseDown = (e: React.MouseEvent) => {
    this.handleDown({ x: e.clientX, y: e.clientY });
  };

  private handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    this.handleMove({ x: e.clientX, y: e.clientY });
  };

  private handleMouseUp = () => {
    this.handleUp();
  };

  private handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    this.handleDown({ x: touch.clientX, y: touch.clientY });
  };

  private handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    this.handleMove({ x: touch.clientX, y: touch.clientY });
  };

  private handleTouchEnd = () => {
    this.handleUp();
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.setState(
      (prevState) => ({
        offset: {
          x: prevState.offset.x - e.deltaX,
          y: prevState.offset.y - e.deltaY,
        },
        velocity: { x: 0, y: 0 },
      }),
      this.debouncedUpdateGridItems,
    );
  };

  render() {
    const { offset, isDragging, gridItems, isMoving } = this.state;
    const { gridSize, className } = this.props;

    const containerWidth = this.cachedWidth;
    const containerHeight = this.cachedHeight;

    return (
      <div
        ref={this.containerRef as React.RefObject<HTMLDivElement>}
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          touchAction: "none",
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.handleMouseMove}
        onMouseUp={this.handleMouseUp}
        onMouseLeave={this.handleMouseUp}
        onTouchStart={this.handleTouchStart}
        onTouchEnd={this.handleTouchEnd}
        onTouchCancel={this.handleTouchEnd}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
            willChange: "transform",
          }}
        >
          {gridItems.map((item) => {
            const gap = this.effectiveGap;
            const step = gridSize + gap;
            const x = item.position.x * step + containerWidth / 2;
            const y = item.position.y * step + containerHeight / 2;
            const cellWidth =
              gridSize * item.colSpan + gap * (item.colSpan - 1);
            const cellHeight =
              gridSize * item.rowSpan + gap * (item.rowSpan - 1);

            return (
              <div
                key={`${item.position.x}-${item.position.y}`}
                style={{
                  position: "absolute",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  userSelect: "none",
                  width: cellWidth,
                  height: cellHeight,
                  transform: `translate3d(${x}px, ${y}px, 0)`,
                  marginLeft: `-${gridSize / 2}px`,
                  marginTop: `-${gridSize / 2}px`,
                }}
              >
                {this.props.renderItem({
                  gridIndex: item.gridIndex,
                  position: item.position,
                  isMoving,
                  colSpan: item.colSpan,
                  rowSpan: item.rowSpan,
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

/**
 * Returns the colSpan needed to fit an image of the given natural width
 * within a grid of the given cell size.
 */
export function colSpanForWidth(
  naturalWidth: number,
  gridSize: number,
): number {
  if (gridSize <= 0) return 1;
  return Math.max(1, Math.round(naturalWidth / gridSize));
}

/**
 * Returns the rowSpan needed to fit an image of the given natural height
 * within a grid of the given cell size.
 */
export function rowSpanForHeight(
  naturalHeight: number,
  gridSize: number,
): number {
  if (gridSize <= 0) return 1;
  return Math.max(1, Math.round(naturalHeight / gridSize));
}

export default FlexibleThiingsGrid;
