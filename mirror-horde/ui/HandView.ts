import type { TileType } from "../core/types";
import { TILE_GLYPHS } from "../content/tiles";

export function tileGlyph(tileType: TileType): string {
  return TILE_GLYPHS[tileType];
}
