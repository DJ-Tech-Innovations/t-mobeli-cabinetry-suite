// Parametric furniture types: generate a cut list, sheet counts, and hardware from dimensions.
import type { FurnitureCategory } from "./data";

export const SHEET_W = 2440;
export const SHEET_H = 1220;
export const WASTE_FACTOR = 0.15;

/** Board thickness (mm) */
const T = 18;
/** Kicker / plinth height (mm) */
const KICK = 80;
const EDGE_ROLL_M = 50;

export type BoardKey = "carcass18" | "plywood18" | "backing4";

export const BOARDS: Record<BoardKey, { label: string; materialId: string; tone: "amber" | "blue" | "slate" }> = {
  carcass18: { label: "18mm Melamine Board (Woodgrain)", materialId: "material-011", tone: "amber" },
  plywood18: { label: "18mm Marine Plywood", materialId: "material-001", tone: "blue" },
  backing4: { label: "4mm Melamine Backing (White)", materialId: "material-012", tone: "slate" },
};

const HW = {
  hinge: "material-004",
  slide: "material-005",
  handle: "material-006",
  shelfPin: "material-013",
  edgeBanding: "material-008",
} as const;

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface CutPart {
  name: string;
  width: number;
  height: number;
  qty: number;
  board: BoardKey;
}

export interface HardwareLine {
  name: string;
  qty: number;
  unit: string;
  /** null when there is no matching material in the catalogue */
  materialId: string | null;
}

export interface BuildResult {
  parts: CutPart[];
  hardware: HardwareLine[];
}

export interface FurnitureType {
  code: string;
  name: string;
  category: FurnitureCategory;
  icon: string;
  description: string;
  options: Record<keyof Dimensions, number[]>;
  labels?: Partial<Record<keyof Dimensions, string>>;
  defaults: Dimensions;
  build: (d: Dimensions) => BuildResult;
}

class CutListBuilder {
  private parts: CutPart[] = [];
  private hardwareLines: HardwareLine[] = [];

  /** Adds a part, merging with an identical part (same name, size, board). */
  part(name: string, width: number, height: number, qty: number, board: BoardKey = "carcass18") {
    if (qty <= 0) return;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const existing = this.parts.find(p => p.name === name && p.width === w && p.height === h && p.board === board);
    if (existing) existing.qty += qty;
    else this.parts.push({ name, width: w, height: h, qty, board });
  }

  hardware(name: string, qty: number, unit: string, materialId: string | null) {
    if (qty <= 0) return;
    const existing = this.hardwareLines.find(h => h.name === name);
    if (existing) existing.qty += qty;
    else this.hardwareLines.push({ name, qty, unit, materialId });
  }

  build(): BuildResult {
    // Roughly 60% of board edges (excluding backing) get banded.
    const edgeM = this.parts
      .filter(p => p.board !== "backing4")
      .reduce((sum, p) => sum + (2 * (p.width + p.height) * p.qty) / 1000, 0);
    this.hardware("Edge Banding PVC", Math.max(1, Math.ceil((edgeM * 0.6) / EDGE_ROLL_M)), "roll", HW.edgeBanding);
    return { parts: this.parts, hardware: this.hardwareLines };
  }
}

const hingesPerDoor = (doorHeight: number) => (doorHeight <= 900 ? 2 : doorHeight <= 1600 ? 3 : 4);

function addDoors(b: CutListBuilder, count: number, totalWidth: number, doorHeight: number) {
  b.part("Door Face", Math.floor(totalWidth / count) - 2, doorHeight, count);
  b.hardware("Soft-Close Hinge", count * hingesPerDoor(doorHeight), "pcs", HW.hinge);
  b.hardware("Cabinet Handle", count, "pcs", HW.handle);
}

function addDrawer(b: CutListBuilder, o: { faceWidth: number; faceHeight: number; boxWidth: number; boxDepth: number }) {
  const boxHeight = Math.max(60, o.faceHeight - 40);
  b.part("Drawer Face", o.faceWidth, o.faceHeight, 1);
  b.part("Drawer Side", o.boxDepth, boxHeight, 2);
  b.part("Drawer Inner (F&B)", o.boxWidth - 2 * T, boxHeight, 2);
  b.part("Drawer Floor", o.boxWidth, o.boxDepth, 1, "backing4");
  b.hardware("Full-Ext Drawer Slide", 1, "pair", HW.slide);
  b.hardware("Cabinet Handle", 1, "pcs", HW.handle);
}

/** Floor-standing carcass with kicker and worktop substrate. Returns the inner width. */
function baseCarcass(b: CutListBuilder, { width: W, height: H, depth: D }: Dimensions) {
  const inner = W - 2 * T;
  b.part("Side Panel (Vertical)", D, H, 2);
  b.part("Bottom Panel", D, inner, 1);
  b.part("Top Nailer Rail", 100, inner, 2);
  b.part("Kicker Rail", inner, KICK, 1);
  b.part("Back Panel", inner, H - KICK, 1, "backing4");
  b.part("Worktop Substrate", W, D, 1, "plywood18");
  return inner;
}

/** Base unit made only of drawers; ratios split the front height (last drawer takes the remainder). */
function drawerStack(d: Dimensions, ratios: number[]): BuildResult {
  const b = new CutListBuilder();
  const inner = baseCarcass(b, d);
  const zone = d.height - KICK - 3 * ratios.length;
  let used = 0;
  ratios.forEach((ratio, i) => {
    const faceHeight = i === ratios.length - 1 ? zone - used : Math.round(zone * ratio);
    used += faceHeight;
    addDrawer(b, { faceWidth: d.width - 2, faceHeight, boxWidth: inner - 26, boxDepth: d.depth - 60 });
  });
  return b.build();
}

function wallCarcass(b: CutListBuilder, { width: W, height: H, depth: D }: Dimensions) {
  const inner = W - 2 * T;
  b.part("Side Panel (Vertical)", D, H, 2);
  b.part("Top & Bottom Panel", D, inner, 2);
  b.part("Back Panel", inner, H, 1, "backing4");
  return inner;
}

const baseOptions = { width: [300, 400, 450, 500, 600, 700, 800, 900, 1000, 1200], height: [720, 760, 820, 870, 900], depth: [460, 500, 560, 600] };
const baseDefaults = { width: 600, height: 720, depth: 560 };
const wallOptions = { width: [300, 400, 450, 500, 600, 800, 900, 1000, 1200], height: [360, 450, 600, 720, 900], depth: [300, 320, 350, 400] };

export const FURNITURE_TYPES: FurnitureType[] = [
  {
    code: "BU1DR2SD",
    name: "1 Drawer + 2 Swing Doors",
    category: "base-unit",
    icon: "🗄️",
    description: "Kitchen/vanity base cabinet with top drawer and 2 swing doors. Includes adjustable shelf and worktop substrate.",
    options: baseOptions,
    defaults: baseDefaults,
    build: d => {
      const b = new CutListBuilder();
      const inner = baseCarcass(b, d);
      const drawerFace = 130;
      addDrawer(b, { faceWidth: d.width - 2, faceHeight: drawerFace, boxWidth: inner - 26, boxDepth: d.depth - 60 });
      b.part("Drawer Runner Support", inner, 60, 2);
      addDoors(b, 2, d.width, d.height - KICK - drawerFace - 6);
      b.part("Adjustable Shelf", d.depth - 20, inner - 2, 1);
      b.hardware("Shelf Support Pin", 4, "pcs", HW.shelfPin);
      return b.build();
    },
  },
  {
    code: "BU3DRS",
    name: "3 Drawer Standard",
    category: "base-unit",
    icon: "🗄️",
    description: "Three-drawer base unit with graduated heights (25 / 32 / 43%). Ideal for linens, cutlery, and deep storage.",
    options: baseOptions,
    defaults: baseDefaults,
    build: d => drawerStack(d, [0.25, 0.32, 0.43]),
  },
  {
    code: "BU2DR",
    name: "2 Drawer",
    category: "base-unit",
    icon: "🗄️",
    description: "Two-drawer base unit — smaller top drawer, larger bottom drawer.",
    options: baseOptions,
    defaults: baseDefaults,
    build: d => drawerStack(d, [0.4, 0.6]),
  },
  {
    code: "BU3DRE",
    name: "3 Drawer Equal",
    category: "base-unit",
    icon: "🗄️",
    description: "Three equal-height drawers. Clean, uniform look. Great for bedside tables or bathroom vanities.",
    options: baseOptions,
    defaults: baseDefaults,
    build: d => drawerStack(d, [1 / 3, 1 / 3, 1 / 3]),
  },
  {
    code: "WU2SD",
    name: "2 Swing Doors",
    category: "wall-unit",
    icon: "📦",
    description: "Upper wall cabinet with 2 swing doors and 2 adjustable shelves.",
    options: wallOptions,
    defaults: { width: 600, height: 720, depth: 320 },
    build: d => {
      const b = new CutListBuilder();
      const inner = wallCarcass(b, d);
      b.part("Adjustable Shelf", d.depth - 20, inner - 2, 2);
      addDoors(b, 2, d.width, d.height - 4);
      b.hardware("Shelf Support Pin", 8, "pcs", HW.shelfPin);
      return b.build();
    },
  },
  {
    code: "WU4SD",
    name: "4 Swing Doors",
    category: "wall-unit",
    icon: "📦",
    description: "Wide upper wall cabinet with 4 swing doors, centre divider, and 4 adjustable shelves.",
    options: { ...wallOptions, width: [900, 1000, 1200, 1500, 1800] },
    defaults: { width: 1200, height: 720, depth: 320 },
    build: d => {
      const b = new CutListBuilder();
      const inner = wallCarcass(b, d);
      b.part("Centre Divider", d.depth - 20, d.height - 2 * T, 1);
      b.part("Adjustable Shelf", d.depth - 20, Math.floor((inner - T) / 2) - 2, 4);
      addDoors(b, 4, d.width, d.height - 4);
      b.hardware("Shelf Support Pin", 16, "pcs", HW.shelfPin);
      return b.build();
    },
  },
  {
    code: "WARDROBE",
    name: "Wardrobe / Closet",
    category: "wardrobe",
    icon: "👔",
    description: "Full-height swing-door wardrobe with hanging rod, fixed shelves, and optional dividers. Doors auto-scale with width.",
    options: { width: [600, 900, 1200, 1500, 1800, 2100], height: [1800, 2000, 2100, 2400], depth: [550, 600, 650] },
    defaults: { width: 1200, height: 2100, depth: 600 },
    build: ({ width: W, height: H, depth: D }) => {
      const b = new CutListBuilder();
      const inner = W - 2 * T;
      const bays = W > 1200 ? 2 : 1;
      b.part("Side Panel (Vertical)", D, H, 2);
      b.part("Top & Bottom Panel", D, inner, 2);
      b.part("Plinth Rail", inner, KICK, 1);
      if (bays === 2) b.part("Centre Divider", D - 20, H - KICK - 2 * T, 1);
      b.part("Fixed Shelf", D - 20, bays === 2 ? Math.floor((inner - T) / 2) : inner, 2 * bays);
      const backPanels = Math.ceil(inner / SHEET_H);
      b.part("Back Panel", Math.ceil(inner / backPanels), H - KICK, backPanels, "backing4");
      addDoors(b, W <= 900 ? 2 : W <= 1500 ? 3 : 4, W, H - KICK - 4);
      b.hardware("Shelf Support Pin", 4 * bays, "pcs", HW.shelfPin);
      b.hardware("Hanging Rod", bays, "pcs", null);
      return b.build();
    },
  },
  {
    code: "BEDFRAME",
    name: "Bed Frame + Storage",
    category: "bed",
    icon: "🛏️",
    description: "Platform bed frame with upholstered MDF headboard and under-bed storage drawers. Drawers auto-scale with width.",
    options: { width: [900, 1000, 1200, 1500, 1800], height: [900, 1000, 1100, 1200], depth: [1900, 2000, 2100] },
    labels: { width: "Mattress Width", height: "Headboard Height", depth: "Mattress Length" },
    defaults: { width: 1500, height: 1000, depth: 2000 },
    build: ({ width: W, height: H, depth: D }) => {
      const b = new CutListBuilder();
      const frameWidth = W + 2 * T;
      b.part("Headboard Panel", frameWidth, H, 1);
      b.part("Footboard Panel", frameWidth, 350, 1);
      b.part("Side Rail", D, 300, 2, "plywood18");
      b.part("Centre Support Rail", D, 250, 1, "plywood18");
      const basePanels = Math.ceil(D / SHEET_H);
      b.part("Platform Base", W, Math.ceil(D / basePanels), basePanels, "plywood18");
      const drawers = W >= 1500 ? 4 : 2;
      const faceWidth = Math.floor((D - 100) / (drawers / 2)) - 4;
      for (let i = 0; i < drawers; i++) {
        addDrawer(b, { faceWidth, faceHeight: 200, boxWidth: faceWidth - 40, boxDepth: Math.min(500, Math.floor(W / 2) - 50) });
      }
      return b.build();
    },
  },
];

export const fitsOnSheet = (p: Pick<CutPart, "width" | "height">) =>
  (p.width <= SHEET_W && p.height <= SHEET_H) || (p.width <= SHEET_H && p.height <= SHEET_W);

export function summarizeCutList(result: BuildResult) {
  const sheetArea = (SHEET_W * SHEET_H) / 1_000_000;
  const boards = (Object.keys(BOARDS) as BoardKey[])
    .map(key => {
      const parts = result.parts.filter(p => p.board === key);
      const area = parts.reduce((sum, p) => sum + (p.width * p.height * p.qty) / 1_000_000, 0);
      const sheets = parts.length ? Math.max(1, Math.ceil((area * (1 + WASTE_FACTOR)) / sheetArea)) : 0;
      return { key, ...BOARDS[key], parts, area, sheets };
    })
    .filter(group => group.parts.length > 0);
  return { boards, pieces: result.parts.reduce((sum, p) => sum + p.qty, 0) };
}

export type CutListSummary = ReturnType<typeof summarizeCutList>;

export interface BomLineDraft {
  materialId: string | null;
  label: string;
  qty: number;
  unit: string;
}

/** Board sheets + hardware, merged by material. */
export function toBomLines(result: BuildResult, summary: CutListSummary): BomLineDraft[] {
  const lines: BomLineDraft[] = [];
  const push = (line: BomLineDraft) => {
    const existing = line.materialId ? lines.find(l => l.materialId === line.materialId) : undefined;
    if (existing) existing.qty += line.qty;
    else lines.push({ ...line });
  };
  summary.boards.forEach(board => push({ materialId: board.materialId, label: board.label, qty: board.sheets, unit: "sheet" }));
  result.hardware.forEach(h => push({ materialId: h.materialId, label: h.name, qty: h.qty, unit: h.unit }));
  return lines;
}
