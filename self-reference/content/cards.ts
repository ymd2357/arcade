import type { Card, CardKind, CardRole } from "../core/types";

export type CardDefinition = {
  defId: string;
  kind: CardKind;
  role: CardRole;
  name: string;
  glyph: string;
  value: number;
  blurb: string;
  rarity: "starter" | "common" | "rare";
};

export const CARD_DEFS: Record<string, CardDefinition> = {
  strike: { defId: "strike", kind: "strike", role: "attack", name: "Strike", glyph: "⚔", value: 4, blurb: "Deal 4.", rarity: "starter" },
  ward: { defId: "ward", kind: "ward", role: "defense", name: "Ward", glyph: "🛡", value: 4, blurb: "Gain 4 Block.", rarity: "starter" },
  whet: { defId: "whet", kind: "whet", role: "modifier", name: "Whet", glyph: "✚", value: 3, blurb: "Spent: cards on both sides gain +3.", rarity: "starter" },
  echo: { defId: "echo", kind: "echo", role: "modifier", name: "Echo", glyph: "↺", value: 0, blurb: "Repeat the card to your left.", rarity: "starter" },

  cleave: { defId: "cleave", kind: "strike", role: "attack", name: "Cleave", glyph: "⚔", value: 7, blurb: "Deal 7.", rarity: "common" },
  bulwark: { defId: "bulwark", kind: "ward", role: "defense", name: "Bulwark", glyph: "🛡", value: 8, blurb: "Gain 8 Block.", rarity: "common" },
  hone: { defId: "hone", kind: "whet", role: "modifier", name: "Hone", glyph: "✚", value: 5, blurb: "Spent: cards on both sides gain +5.", rarity: "common" },
  surge: { defId: "surge", kind: "surge", role: "modifier", name: "Surge", glyph: "⇈", value: 0, blurb: "Spent: the card to the right is doubled.", rarity: "common" },
  tally: { defId: "tally", kind: "tally", role: "attack", name: "Tally", glyph: "≣", value: 2, blurb: "Deal 2 for each other card in the line.", rarity: "common" },

  ergo: { defId: "ergo", kind: "ergo", role: "attack", name: "Ergo", glyph: "∴", value: 9, blurb: "If the card to your left is an Attack, deal 9 (else 3).", rarity: "rare" },
  resound: { defId: "resound", kind: "echo", role: "modifier", name: "Resound", glyph: "↻", value: 0, blurb: "Repeat the card to your left.", rarity: "rare" },
};

export const STARTER_DECK: string[] = [
  "strike",
  "strike",
  "strike",
  "strike",
  "ward",
  "ward",
  "ward",
  "whet",
  "whet",
  "echo",
];

export const REWARD_POOL: string[] = [
  "cleave",
  "bulwark",
  "hone",
  "surge",
  "tally",
  "ergo",
  "resound",
  "strike",
  "ward",
  "whet",
];

export function instantiate(defId: string, uid: string): Card {
  const def = CARD_DEFS[defId];
  return {
    uid,
    defId: def.defId,
    kind: def.kind,
    role: def.role,
    name: def.name,
    glyph: def.glyph,
    value: def.value,
    blurb: def.blurb,
    buffed: false,
  };
}
