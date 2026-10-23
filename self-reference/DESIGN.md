# Self-Reference (自己言及) — 設計ドキュメント

> ローグライク・デッキ構築。novel mechanic: **一部のカード（Editor）は、他のカードの
> 文面（＝効果データ）をランの間ずっと書き換える。** カードはデータであり、文章は
> データから描画される。だから「書き換え」はデータ変換 → テキスト再描画として成立する。
> mujun テーマ: 自己言及・矛盾（カードがカードを定義し直す）。

## 0. 分業（重要）

- **ビジュアル層（index.html の CSS / DOM 構造 / アニメーション）は人間（Claude）が所有**する。
- **ロジック層（`core/`・`content/`・`main.ts` の描画配線・`storage/`）は Codex が実装**する。
- 両者の境界は **DOM 契約（§7）**。Codex は §7 のクラス/ID/カードテンプレートに
  「完全に一致する」DOM を生成すること。CSS は人間側が当てる。**Codex は CSS を書かない**
  （index.html は人間が用意済み。Codex は触らない）。

## 1. コンセプト / ループ

- 1 戦闘 = ターン制カードバトル（プレイヤー vs 敵）。
- 各ターン: 手札を引く → エナジーを払ってカードをプレイ（攻撃/防御/編集）→ End Turn →
  敵が intent 通りに行動 → 次ターン（Block リセット・ドロー）。
- 勝利 → 報酬（3枚から1枚を獲得）→ 次の戦闘。縦切り = **3戦 → 勝利**。
- 敗北（HP0）→ Defeat → リスタート。
- 1 ラン 5〜10 分。

## 2. データモデル（心臓）

```ts
type Target = "enemy" | "allEnemies" | "self";

type EffectOp =
  | { kind: "damage"; amount: number; target: Target }
  | { kind: "block"; amount: number }            // 常に self
  | { kind: "draw"; amount: number }
  | { kind: "energy"; amount: number }
  | { kind: "weak"; amount: number; target: Target }       // 敵の与ダメ -25%
  | { kind: "vulnerable"; amount: number; target: Target } // 被ダメ +50%
  | { kind: "heal"; amount: number };

type CardType = "attack" | "skill" | "power" | "editor";
type Keyword = "exhaust" | "retain";

type Card = {
  uid: string;        // インスタンス固有 ID（デッキ内で一意）
  defId: string;      // テンプレ ID
  name: string;
  type: CardType;
  cost: number;
  effects: EffectOp[];
  keywords: Keyword[];
  rarity: "starter" | "common" | "uncommon" | "rare";
  glyph: string;      // カードアートの記号（§7 .card-art）
  edited: boolean;    // 一度でも書き換えられたら true（UI でマーク）
  // editor 専用:
  edit?: EditSpec;    // type==="editor" のとき、ターゲットへ適用する変換
};
```

- **デッキはインスタンス（uid）の配列**。編集は対象インスタンスの effects/cost 等を
  破壊的に変えて `edited=true`、ランの間ずっと持続（＝デッキ進化）。

## 3. テキストレンダラ（effects → 文章）

`renderCardText(card): string` を実装。**数値は `<em class="num">` で、対象は語句で囲む**
（編集時にその箇所だけグリッチ再流動させるため）。例:

| effect | 文 |
|---|---|
| damage 6 enemy | `Deal <em class="num">6</em> damage.` |
| damage 8 allEnemies | `Deal <em class="num">8</em> damage to <em class="tgt">all enemies</em>.` |
| block 5 | `Gain <em class="num">5</em> Block.` |
| draw 2 | `Draw <em class="num">2</em> cards.` |
| energy 1 | `Gain <em class="num">1</em> Energy.` |
| weak 1 enemy | `Apply <em class="num">1</em> Weak.` |
| vulnerable 1 enemy | `Apply <em class="num">1</em> Vulnerable.` |
| heal 4 | `Heal <em class="num">4</em> HP.` |

- 複数 effect は文を連結（`. ` 区切り）。keyword は別行（§7 .card-keywords）。
- editor カードの文: その変換を説明（§4 の text 列）。

## 4. Editor カード（書き換え＝novel mechanic）

editor をプレイ → **「手札の対象カードを選ぶ」モード**へ（敵でなくカードを選ぶ）。
選択カードの effects/cost を破壊的に変換し `edited=true`。editor 自身は exhaust。

縦切りで実装する EditSpec（`edit.kind`）:

| name | edit.kind | 効果 | 表示文 |
|---|---|---|---|
| Amplify | `amplify` | 対象の全数値 +3 | `Edit: a card gains +3 to its values this run.` |
| Broaden | `broaden` | 対象の damage 対象を allEnemies に | `Edit: a card's damage now hits all enemies.` |
| Transmute | `transmute` | 対象の damage↔block を入替（amount 保持） | `Edit: swap a card's damage and Block.` |
| Compress | `compress` | 対象 cost=0、Exhaust 付与 | `Edit: a card costs 0 but Exhausts.` |
| Paradox | `paradox` | 対象の damage を self/heal へ反転（矛盾）かつ +5（強力で危険） | `Edit: a card turns on its owner — and grows.` |

- 対象不適合（例: damage を持たぬカードに broaden）は「無効な対象」としてグレーアウト or 選択不可。
- editor で editor は対象にできない。
- amplify は全 `amount` を持つ effect に +3。transmute は最初の damage と block を交換。

## 5. 戦闘ルール（純粋 reducer）

- Player: `hp,maxHp`（例 70）, `block`(毎ターン頭で 0), `energy`(毎ターン 3), 手札上限なし、
  毎ターン頭に 5 ドロー。山札が尽きたら捨札をシャッフルして補充（seed RNG）。
- Enemy: `hp,maxHp`, `block`, `intent`（次行動を telegraph）, ステータス(weak/vulnerable のターン数)。
- intent は **script の配列をループ**（例: `[{attack:9},{block:6},{attack:6,times:2}]`）。
- ダメージ計算: 攻撃側 weak なら ×0.75（切り捨て）、被弾側 vulnerable なら ×1.5。Block で吸収。
- ステータスは各自のターン終了で 1 減。
- 勝敗: 敵 hp≤0 → `phase:"reward"`。player hp≤0 → `phase:"defeat"`。
- 完全に seed 駆動・決定的。**Undo は無し**（デッキ構築の慣習）。RESTART あり。

Phase: `"combat" | "selectTarget" | "reward" | "victory" | "defeat"`。

## 6. コンテンツ（縦切り）

- スターターデッキ（10枚程度）: Strike×4(attack,cost1,damage6 enemy), Defend×4(skill,cost1,block5),
  + Amplify×1(editor), + Broaden×1(editor)。
- 報酬プール（common/uncommon/rare, ~14枚）: Cleave(damage8 allEnemies), Bash(damage8+vulnerable1),
  Pommel(damage5+draw1), Quick Slash(cost0,damage4,exhaust), Iron Wave(damage5+block5),
  Energize(energy2), Second Wind(block big), Transmute(editor), Compress(editor), Paradox(editor) など。
- 敵（3戦・procgen 不要、手書き intent script）:
  1. **Spineless Echo**（hp 32, attack 軽め＋たまに block）
  2. **Twin Glyphs**（2体、各 hp 18、allEnemies の価値を教える）
  3. **The Author**（boss, hp 60, 強攻＋vulnerable 付与＋たまに自己 block。自己言及テーマのボス）
- 各戦闘後に報酬カード 3 枚提示（rng で重複なく抽選）。

## 7. DOM 契約（人間の CSS が依存。Codex は厳守）

index.html（人間が用意）に以下の固定 ID/構造がある。Codex の render はここに描画する。

固定コンテナ ID:
- `#enemies`（敵カードを並べる）, `#player-block`, `#player-hp`, `#player-hp-bar`,
  `#energy`（"3/3"）, `#deck-count`, `#discard-count`, `#hand`（手札）,
  `#btn-end`（End Turn）, `#btn-restart`,
  `#reward`（報酬オーバーレイ, `.show` で表示）, `#reward-cards`,
  `#phase-overlay`（defeat/victory, `.show`+`data-kind`）, `#phase-title`, `#phase-text`, `#btn-phase`,
  `#title`（タイトル画面, `.hide` で退場）, `#btn-start`,
  `#target-hint`（selectTarget 中のヒント帯, `.show`）, `#toast`。

**カード DOM テンプレート（render が生成する文字列。class 完全一致）:**
```html
<div class="card" data-type="attack" data-cost="1" data-rarity="common" data-edited="false" data-playable="true">
  <div class="card-frame">
    <div class="card-cost">1</div>
    <div class="card-name">Strike</div>
    <div class="card-art"><span>⚔</span></div>
    <div class="card-type">Attack</div>
    <div class="card-text">Deal <em class="num">6</em> damage.</div>
    <div class="card-keywords">Exhaust</div>
  </div>
</div>
```
- `data-playable="false"` は energy 不足/対象不適合（CSS で暗く）。
- 編集済みは `data-edited="true"`（CSS で金の縁＋"✎"）。`.card-keywords` 空なら非表示は CSS。
- 数値・対象を `<em class="num">` `<em class="tgt">` で包む（§3）。
- カードをクリック → `main.ts` が `PLAY`（または selectTarget 中は `CHOOSE_TARGET`）を dispatch。

**敵 DOM テンプレート:**
```html
<div class="enemy" data-id="e0">
  <div class="enemy-intent" data-kind="attack">⚔ 9</div>
  <div class="enemy-body"><span class="enemy-glyph">👁</span></div>
  <div class="enemy-name">Spineless Echo</div>
  <div class="enemy-hpbar"><div class="enemy-hpfill" style="width:80%"></div></div>
  <div class="enemy-stats">HP 26/32 <span class="enemy-block">⛨3</span> <span class="enemy-status">Weak 1</span></div>
</div>
```
- intent `data-kind`: `attack|block|buff|debuff|unknown`。攻撃は数値（×times は "9×2"）。

**アニメ用フック（CSS keyframes は人間が定義。Codex は class を付与/除去するだけ）:**
- カードプレイ時: 対象 `.card` に一時クラス `playing` を付け、~260ms 後に削除してから DOM 再構築。
- 編集確定時: 対象カードの書き換わった `.num`/`.tgt` に `rewriting` を付与（インク再流動）。
- 被ダメ時: `.enemy`/`#player-hp` に `hit` を付与、float する数字を `.dmg-float` で `#fx-layer` に追加。
- `#fx-layer`（盤面上の絶対配置レイヤ）も index.html に用意済み。

> render は「全再構築」で良い（毎 dispatch 後に hand/enemies を作り直す）。ただし上記
> 一時アニメは、再構築の前に旧要素へ class を付けて待ってから差し替えると自然。最小実装として
> 「再構築のみ＋ CSS の出現アニメ」でも可（その場合 playing/hit は省略可、rewriting は必須）。

## 8. アーキテクチャ（mirror-horde 規約に一致）

```
self-reference/
  main.ts                 # 配線＋ §7 へ描画
  core/
    types.ts
    rng.ts                # seed RNG（mirror-horde 流用可）
    textRenderer.ts       # effects → 文字列（§3）
    edits.ts              # EditSpec の適用（§4）
    combat.ts             # 純粋 reducer（§5）
    enemyAI.ts            # intent script 解決
  content/
    cards.ts              # カード def（スターター＋報酬プール, §6）
    enemies.ts            # 敵 def＋intent script（§6）
  ui/App.ts               # §7 の DOM 要素取得
  storage/save.ts         # localStorage（最高到達戦闘数）
  index.html              # 人間が所有（CSS・構造・アニメ）。Codex は触らない
  vite.config.ts          # base:"/arcade/self-reference/", root:"self-reference"
  tsconfig.json           # root を extends, include ["."]
DESIGN.md
```

- root `package.json` に `dev:self`/`build:self` を追加（既存を壊さない）。
- core は純粋（DOM 非依存）。`Math.random` 不可、seed RNG のみ。strict / noUnusedLocals 厳守。

## 9. 縦切り完了条件

- [ ] 3戦（Echo → Twin Glyphs → The Author）を勝ち抜ける。各戦後に報酬1枚獲得。
- [ ] スターター＋報酬で Editor が機能: Amplify/Broaden/Transmute/Compress/Paradox のうち
      最低 3 種が、対象カードの**文章を実際に書き換え**、その効果が戦闘に反映される。
- [ ] energy/block/weak/vulnerable/exhaust/draw が正しく動く。敵 intent が telegraph される。
- [ ] `tsc --noEmit` 通過、`build:self` 通過。スマホ縦持ちで操作可能。
```
