import type { TileType } from "../core/types";

export const TILE_GLYPHS: Record<TileType, string> = {
  mirrorSlash: "/",
  mirrorBackslash: "\\",
  absorber: "■",
  splitterStraightRight: "⌐",
  splitterStraightLeft: "¬",
  splitterLeftRight: "↔",
  splitterAll: "⊕",
};

export const TILE_NAMES: Record<TileType, string> = {
  mirrorSlash: "Slash Mirror",
  mirrorBackslash: "Backslash Mirror",
  absorber: "Absorber",
  splitterStraightRight: "Straight + Right Splitter",
  splitterStraightLeft: "Straight + Left Splitter",
  splitterLeftRight: "Left + Right Splitter",
  splitterAll: "All Splitter",
};
