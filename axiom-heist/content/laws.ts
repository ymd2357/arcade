import type { LawId } from "../core/types.ts";

export type LawContent = {
  name: string;
  description: string;
  glyph: string;
};

export const LAW_CONTENT: Record<LawId, LawContent> = {
  GRAVITY_DOWN: {
    name: "Gravity Down",
    description: "Metal falls one cell after each turn when space is open below.",
    glyph: "↓",
  },
  LIGHT_PUSHES_METAL: {
    name: "Light Pushes Metal",
    description: "Light rays shove the first metal block they strike away from the source.",
    glyph: "☀",
  },
  DOORS_OPEN_WHEN_UNWATCHED: {
    name: "Unwatched Doors",
    description: "Doors open only while no guard line of sight touches them.",
    glyph: "▯",
  },
  GUARDS_FEAR_DARK: {
    name: "Guards Fear Dark",
    description: "Guards refuse to step into cells that are not lit.",
    glyph: "◒",
  },
  MIRRORS_REFLECT_VISION: {
    name: "Mirror Sight",
    description: "Guard sight reflects from mirror tiles instead of stopping.",
    glyph: "╱",
  },
  THIEF_HIDDEN_WHILE_STILL: {
    name: "Stillness Cloak",
    description: "Waiting makes the thief invisible for that turn's detection check.",
    glyph: "·",
  },
};
