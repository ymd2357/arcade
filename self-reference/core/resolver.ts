import type { Card, CollisionMode, Enemy, PlayerState, ResolveStep } from "./types";

export type ResolveResult = {
  line: Card[];
  enemies: Enemy[];
  player: PlayerState;
  steps: ResolveStep[];
};

function firstAlive(enemies: Enemy[]): Enemy | undefined {
  return enemies.find((e) => e.hp > 0);
}

const ATTACK_KINDS: ReadonlyArray<Card["kind"]> = ["strike", "ergo", "tally", "echo"];

/**
 * Resolve a SINGLE played card, reading its immediate neighbours.
 * The played card is removed; if it sat in the MIDDLE, its former left/right
 * neighbours become adjacent and a COLLISION resolves (per `mode`).
 */
export function resolvePlay(
  line: Card[],
  index: number,
  enemiesIn: Enemy[],
  playerIn: PlayerState,
  mode: CollisionMode,
  fuseRipple = 1
): ResolveResult {
  const enemies = enemiesIn.map((e) => ({ ...e }));
  const player: PlayerState = { ...playerIn };
  const work = line.map((c) => ({ ...c }));
  const steps: ResolveStep[] = [];

  const card = work[index];
  const left = work[index - 1];
  const right = work[index + 1];
  const hadBoth = index > 0 && index < work.length - 1;

  const dealDamage = (raw: number, note?: string): void => {
    const target = firstAlive(enemies);
    const amount = player.weak > 0 ? Math.floor(raw * 0.75) : raw;
    if (!target || amount <= 0) {
      steps.push({ kind: "fizzle", note: note ?? "no effect" });
      return;
    }
    const blocked = Math.min(target.block, amount);
    target.block -= blocked;
    const dmg = Math.max(0, amount - blocked);
    target.hp = Math.max(0, target.hp - dmg);
    steps.push({ kind: "damage", amount: dmg, enemyId: target.id, note });
  };

  const gainBlock = (raw: number): void => {
    if (raw <= 0) {
      steps.push({ kind: "fizzle", note: "no block" });
      return;
    }
    player.block += raw;
    steps.push({ kind: "block", amount: raw });
  };

  // ---- the played card's own effect ----
  switch (card.kind) {
    case "strike":
      dealDamage(card.value);
      break;
    case "ward":
      gainBlock(card.value);
      break;
    case "ergo":
      dealDamage(left && ATTACK_KINDS.includes(left.kind) ? card.value : 3, left ? undefined : "no card to the left");
      break;
    case "tally":
      dealDamage(card.value * (work.length - 1), `${work.length - 1} others`);
      break;
    case "echo":
      if (left && left.kind === "strike") dealDamage(left.value, "echo ⚔");
      else if (left && left.kind === "ward") gainBlock(left.value);
      else if (left && (left.kind === "ergo" || left.kind === "tally")) dealDamage(left.value, "echo");
      else steps.push({ kind: "fizzle", note: "nothing to echo" });
      break;
    case "whet": {
      let touched = false;
      if (left) { left.value += card.value; left.buffed = true; steps.push({ kind: "buff", uid: left.uid, note: `+${card.value}` }); touched = true; }
      if (right) { right.value += card.value; right.buffed = true; steps.push({ kind: "buff", uid: right.uid, note: `+${card.value}` }); touched = true; }
      if (!touched) steps.push({ kind: "fizzle", note: "no neighbour" });
      break;
    }
    case "surge":
      if (right) {
        right.value *= 2;
        right.buffed = true;
        steps.push({ kind: "buff", uid: right.uid, note: "×2 →" });
      } else {
        steps.push({ kind: "fizzle", note: "no card to the right" });
      }
      break;
  }

  // capture neighbour identities BEFORE removing the played card
  const leftUid = hadBoth ? left.uid : null;
  const rightUid = hadBoth ? right.uid : null;
  work.splice(index, 1);

  // ---- collision: former neighbours are now adjacent ----
  if (mode !== "none" && leftUid && rightUid) {
    const L = work.find((c) => c.uid === leftUid);
    const R = work.find((c) => c.uid === rightUid);
    if (L && R) applyCollision(mode, L, R, work, steps, dealDamage, gainDamageHelpers(gainBlock, player), fuseRipple);
  }

  return { line: work, enemies, player, steps };
}

// small indirection so the collision helper can both block and self-damage the player
function gainDamageHelpers(gainBlock: (n: number) => void, player: PlayerState) {
  return {
    gainBlock,
    selfDamage: (n: number) => {
      player.hp = Math.max(0, player.hp - n);
    },
  };
}

function applyCollision(
  mode: CollisionMode,
  L: Card,
  R: Card,
  work: Card[],
  steps: ResolveStep[],
  dealDamage: (raw: number, note?: string) => void,
  helpers: { gainBlock: (n: number) => void; selfDamage: (n: number) => void },
  fuseRipple: number
): void {
  const min = Math.min(L.value, R.value);
  const both = (role: Card["role"]) => L.role === role && R.role === role;
  const opposite = (L.role === "attack" && R.role === "defense") || (L.role === "defense" && R.role === "attack");
  const modifier = L.role === "modifier" ? L : R.role === "modifier" ? R : null;
  const other = modifier === L ? R : L;

  const destroy = (card: Card, note: string): void => {
    const i = work.findIndex((c) => c.uid === card.uid);
    if (i >= 0) work.splice(i, 1);
    steps.push({ kind: "destroy", uid: card.uid });
    steps.push({ kind: "collision", note });
  };

  const fireModifier = (): void => {
    if (!modifier) return;
    if (modifier.kind === "whet") { other.value += modifier.value; other.buffed = true; steps.push({ kind: "buff", uid: other.uid, note: `+${modifier.value}` }); }
    else if (modifier.kind === "surge") { other.value *= 2; other.buffed = true; steps.push({ kind: "buff", uid: other.uid, note: "×2" }); }
    else if (modifier.kind === "echo") { if (other.role === "attack") dealDamage(other.value, "echo collide"); else if (other.role === "defense") helpers.gainBlock(other.value); }
    steps.push({ kind: "collision", note: "modifier fires" });
  };

  switch (mode) {
    case "resonance":
      steps.push({ kind: "collision", note: `${L.name} ↔ ${R.name}` });
      if (both("attack")) dealDamage(min, "resonance");
      else if (both("defense")) helpers.gainBlock(min);
      else if (modifier) fireModifier();
      else dealDamage(Math.floor(min / 2), "resonance");
      break;
    case "clash":
      steps.push({ kind: "collision", note: `${L.name} ✕ ${R.name}` });
      if (opposite) destroy(L.value <= R.value ? L : R, "clash — the weaker is lost");
      else if (modifier) destroy(modifier, "clash — modifier wasted");
      // same role: safe, nothing
      break;
    case "reactive":
      steps.push({ kind: "collision", note: `${L.name} ↔ ${R.name}` });
      if (modifier) fireModifier();
      else if (both("attack")) dealDamage(min, "resonance");
      else if (both("defense")) helpers.gainBlock(min);
      else if (opposite) destroy(L.value <= R.value ? L : R, "clash — the weaker is lost");
      break;
    case "propagate":
    case "fuseprop": {
      // Cross-propagation (波及): the colliding pair's effects pass THROUGH the junction to
      // the next-outer card on the opposite side. e.g. line 1,2,[3],4,5 → play 3 →
      // 2 & 4 meet; 4's value also lands on 1, 2's value also lands on 5. (cap = 1 each side)
      const li = work.findIndex((c) => c.uid === L.uid);
      const ri = work.findIndex((c) => c.uid === R.uid);
      const LL = work[li - 1];
      const RR = work[ri + 1];
      steps.push({ kind: "collision", note: `${L.name} ↔ ${R.name}` });
      if (RR) { RR.value += L.value; RR.buffed = true; steps.push({ kind: "buff", uid: RR.uid, note: `+${L.value}` }); }
      if (LL) { LL.value += R.value; LL.buffed = true; steps.push({ kind: "buff", uid: LL.uid, note: `+${R.value}` }); }
      if (mode === "fuseprop") {
        // ...then 2 & 4 fuse into one card.
        L.value += R.value;
        L.buffed = true;
        const i = work.findIndex((c) => c.uid === R.uid);
        if (i >= 0) work.splice(i, 1);
        steps.push({ kind: "destroy", uid: R.uid });
      }
      break;
    }
    case "fuse": {
      // L absorbs the card to its right, then ripples rightward up to `fuseRipple` merges (波及上限).
      let merges = 0;
      const cap = Math.max(1, fuseRipple);
      while (merges < cap) {
        const li = work.findIndex((c) => c.uid === L.uid);
        const rc = work[li + 1];
        if (!rc) break;
        L.value += rc.value;
        work.splice(li + 1, 1);
        steps.push({ kind: "destroy", uid: rc.uid });
        merges++;
      }
      if (merges > 0) {
        L.buffed = true;
        steps.push({ kind: "collision", note: `fused ×${merges} → ${L.name} ${L.value}` });
      }
      break;
    }
    case "none":
      break;
  }
}
