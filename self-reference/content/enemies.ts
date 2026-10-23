import type { Enemy, Intent } from "../core/types";

export type IntentStep = {
  attack?: number;
  times?: number;
  block?: number;
  weak?: number;
};

export function intentFromStep(step: IntentStep): Intent {
  if (step.attack !== undefined) {
    const times = step.times ?? 1;
    return {
      kind: "attack",
      attack: step.attack,
      times,
      weak: step.weak,
      text: times > 1 ? `⚔ ${step.attack}×${times}` : `⚔ ${step.attack}`,
    };
  }
  if (step.weak !== undefined) {
    return { kind: "debuff", weak: step.weak, text: `✦ Weak ${step.weak}` };
  }
  if (step.block !== undefined) {
    return { kind: "block", block: step.block, text: `⛨ ${step.block}` };
  }
  return { kind: "unknown", text: "?" };
}

export type EnemyDefinition = {
  defId: string;
  name: string;
  hp: number;
  glyph: string;
  script: IntentStep[];
};

export type FightDefinition = { enemies: EnemyDefinition[] };

export const FIGHTS: FightDefinition[] = [
  {
    enemies: [
      { defId: "spineless-echo", name: "Spineless Echo", hp: 30, glyph: "👁", script: [{ attack: 7 }, { block: 6 }, { attack: 5, times: 2 }] },
    ],
  },
  {
    enemies: [
      { defId: "twin-a", name: "Twin Glyph", hp: 20, glyph: "ᛝ", script: [{ attack: 6 }, { block: 5 }] },
      { defId: "twin-b", name: "Twin Glyph", hp: 20, glyph: "ᛟ", script: [{ block: 5 }, { attack: 6 }] },
    ],
  },
  {
    enemies: [
      { defId: "the-author", name: "The Author", hp: 64, glyph: "✒", script: [{ attack: 11 }, { weak: 1 }, { attack: 7, times: 2 }, { block: 12 }] },
    ],
  },
];

export const ENEMY_SCRIPTS: Record<string, IntentStep[]> = FIGHTS.flatMap((f) => f.enemies).reduce(
  (acc, e) => ({ ...acc, [e.defId]: e.script }),
  {} as Record<string, IntentStep[]>
);

export function instantiateEnemies(fightIndex: number): Enemy[] {
  const fight = FIGHTS[fightIndex] ?? FIGHTS[0];
  return fight.enemies.map((e, index) => ({
    id: `e${index}`,
    defId: e.defId,
    name: e.name,
    glyph: e.glyph,
    hp: e.hp,
    maxHp: e.hp,
    block: 0,
    scriptIndex: 0,
    intent: intentFromStep(e.script[0] ?? {}),
  }));
}
