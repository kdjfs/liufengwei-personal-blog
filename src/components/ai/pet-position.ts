export const PET_POSITION_KEY = 'lfw-ai-pet-position-v1';
export const PET_DRAG_THRESHOLD = 6;

export type PetEdge = 'left' | 'right';

export interface PetViewport {
  width: number;
  height: number;
  petSize: number;
}

export interface PetPosition {
  edge: PetEdge;
  normalizedY: number;
}

export interface PetCoordinates {
  edge?: PetEdge;
  x: number;
  y: number;
}

const EDGE_GAP = 20;
const SAFE_TOP = 96;
const BOTTOM_CONTROL_CLEARANCE = 102;

function limits(viewport: PetViewport) {
  return {
    minX: EDGE_GAP,
    maxX: Math.max(EDGE_GAP, viewport.width - viewport.petSize - EDGE_GAP),
    minY: Math.min(
      SAFE_TOP,
      Math.max(EDGE_GAP, viewport.height - viewport.petSize - BOTTOM_CONTROL_CLEARANCE),
    ),
    maxY: Math.max(EDGE_GAP, viewport.height - viewport.petSize - BOTTOM_CONTROL_CLEARANCE),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampPetPosition(
  position: Pick<PetCoordinates, 'x' | 'y'>,
  viewport: PetViewport,
): Pick<PetCoordinates, 'x' | 'y'> {
  const safe = limits(viewport);
  return {
    x: Math.round(clamp(position.x, safe.minX, safe.maxX)),
    y: Math.round(clamp(position.y, safe.minY, safe.maxY)),
  };
}

export function snapPetEdge(x: number, viewportWidth: number, petSize: number): PetEdge {
  return x + petSize / 2 < viewportWidth / 2 ? 'left' : 'right';
}

export function normalizePetY(y: number, viewport: PetViewport): number {
  const safe = limits(viewport);
  const range = Math.max(1, safe.maxY - safe.minY);
  return Number(clamp((y - safe.minY) / range, 0, 1).toFixed(4));
}

export function restorePetPosition(position: PetPosition, viewport: PetViewport): PetCoordinates {
  const safe = limits(viewport);
  return {
    edge: position.edge,
    x: position.edge === 'left' ? safe.minX : safe.maxX,
    y: Math.round(safe.minY + clamp(position.normalizedY, 0, 1) * (safe.maxY - safe.minY)),
  };
}

export function parsePetPosition(value: string | null): PetPosition | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<PetPosition>;
    if (
      (parsed.edge === 'left' || parsed.edge === 'right') &&
      typeof parsed.normalizedY === 'number' &&
      Number.isFinite(parsed.normalizedY)
    ) {
      return { edge: parsed.edge, normalizedY: clamp(parsed.normalizedY, 0, 1) };
    }
  } catch {
    // Ignore malformed user-controlled localStorage.
  }
  return undefined;
}
