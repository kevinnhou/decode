import {
  DEFAULT_HEATMAP_GRID_COLS,
  DEFAULT_HEATMAP_GRID_ROWS,
} from "./constants";
import type { HeatSample } from "./spatial";

export type HeatmapBin = {
  col: number;
  row: number;
  count: number;
  matchNumbers: number[];
};

export type BinnedHeatmap = {
  gridCols: number;
  gridRows: number;
  bins: HeatmapBin[];
  maxCount: number;
  totalWeightedHits: number;
};

export type BinHeatmapOptions = {
  gridCols?: number;
  gridRows?: number;
  maxMatchesPerBin?: number;
};

function pushUniqueCapped(list: number[], value: number, cap: number): void {
  if (list.includes(value) || cap <= 0) {
    return;
  }
  if (list.length >= cap) {
    return;
  }
  list.push(value);
}

export function binHeatmap(
  samples: HeatSample[],
  options?: BinHeatmapOptions
): BinnedHeatmap {
  const gridCols = options?.gridCols ?? DEFAULT_HEATMAP_GRID_COLS;
  const gridRows = options?.gridRows ?? DEFAULT_HEATMAP_GRID_ROWS;
  const maxMatchesPerBin = options?.maxMatchesPerBin ?? 12;

  const cellCounts = new Map<string, number>();
  const cellMatches = new Map<string, number[]>();

  let totalWeightedHits = 0;
  for (const s of samples) {
    const col = Math.min(
      gridCols - 1,
      Math.max(0, Math.floor(s.xNorm * gridCols))
    );
    const row = Math.min(
      gridRows - 1,
      Math.max(0, Math.floor(s.yNorm * gridRows))
    );
    const key = `${col},${row}`;
    const w = s.weight > 0 ? s.weight : 1;
    totalWeightedHits += w;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + w);
    const arr = cellMatches.get(key) ?? [];
    pushUniqueCapped(arr, s.matchNumber, maxMatchesPerBin);
    cellMatches.set(key, arr);
  }

  let maxCount = 0;
  const bins: HeatmapBin[] = [];
  for (const [key, count] of cellCounts) {
    const [cs, rs] = key.split(",");
    const col = Number.parseInt(cs ?? "0", 10);
    const row = Number.parseInt(rs ?? "0", 10);
    if (count > maxCount) {
      maxCount = count;
    }
    bins.push({
      col,
      row,
      count,
      matchNumbers: cellMatches.get(key) ?? [],
    });
  }
  bins.sort((a, b) => a.row - b.row || a.col - b.col);

  return {
    gridCols,
    gridRows,
    bins,
    maxCount,
    totalWeightedHits,
  };
}
