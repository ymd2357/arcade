# Axiom Heist — 設計ドキュメント

> 部屋ごとに掲示された「法則(Law)」を1つだけ盗み、次の部屋へ持ち込む。
> 盗んだ法則が部屋の法則と矛盾し、攻略の鍵になる。**戦利品は物理そのもの。**

## 1. コンセプト

- ジャンル: ターン制グリッド・ステルスパズル + ローグライク（部屋を連鎖）。
- 核となる動詞: **盗む(steal)** — 敵やアイテムではなく「法則」を盗む。
- mujun テーマ: 盗んだ法則 × 部屋固有の法則の**矛盾**が、抜け道（exploit）を生む。
- プラットフォーム: スマホ縦持ちブラウザ。SVG描画。バックエンド無し。

## 2. ループ

```
部屋に入る → 掲示された Law 群を読む → 手持ち Law も加味して経路を組む
  → ターンを進めて遺物(artifact)を取り脱出(exit)
  → クリア時、その部屋の Law を1つだけ盗んで手持ちに加える
  → 次の部屋へ（盗んだ Law は全部屋で恒久的に有効）
```

- 1部屋 1〜3分。1ラン = 5〜8部屋。検知(detected)されたら即終了 = ローグライク的リスタート。
- 手持ち Law が増えるほど世界が壊れていく（後半は矛盾を意図的に組んで突破）。

## 3. 法則システム（rules-as-data ＝ 本作の心臓）

Law は**データ**。エンジンが型でインタープリトする。縦切りで実装する Law:

| id | 効果 | 矛盾の作りどころ |
|---|---|---|
| `GRAVITY_DOWN` | 浮いている block は塞がれるまで毎ターン下へ1歩 | 別方向 GRAVITY と衝突 |
| `LIGHT_PUSHES_METAL` | 光線が当たった metal block は光源から1歩押される | block で道を作る/塞ぐ |
| `DOORS_OPEN_WHEN_UNWATCHED` | door は guard 視界に入っていない時だけ通行可 | "guard が見る door" を無効化 |
| `GUARDS_FEAR_DARK` | guard は無光(unlit)セルに入らない | 光源を壊して安全地帯を作る |
| `MIRRORS_REFLECT_VISION` | guard 視線は mirror で反射する（鏡テーマ） | 視線を逸らす/自分に向ける |
| `THIEF_HIDDEN_WHILE_STILL` | 直前ターンに動いていなければ guard から不可視 | 待ちで視線をやり過ごす |

- Law の表現:
  ```ts
  type Law =
    | { id: "GRAVITY_DOWN" }
    | { id: "LIGHT_PUSHES_METAL" }
    | { id: "DOORS_OPEN_WHEN_UNWATCHED" }
    | { id: "GUARDS_FEAR_DARK" }
    | { id: "MIRRORS_REFLECT_VISION" }
    | { id: "THIEF_HIDDEN_WHILE_STILL" };
  ```
- アクティブな Law = `room.laws ∪ carriedLaws`。同 id は1回だけ適用。
- エンジンは Law id ごとに分岐するインタープリタ（巨大 switch ではなく小関数の集合）。
- **拡張は Law を1個足すだけ**で増える → AI開発・procgen と相性が極端に良い。

## 4. 盤面・エンティティ

- グリッド: 7×10（mirror-horde と同寸、縦持ち最適）。
- タイル `CellType`: `floor | wall | door | lightSource | mirror | metal | artifact | exit`。
- エンティティ:
  - `thief`: pos。プレイヤー。
  - `guard[]`: pos, facing(Direction), 視線は facing 方向への直進ray（壁/mirror で停止/反射）。
- 派生状態（毎ターン Law から再計算、保存しない）:
  - `lit: Set<cell>` 光源から各方向へ伸びる光線が通るセル。
  - `watched: Set<cell>` guard 視線が通るセル。
  - `metalBlocks`, `looseBlocks` の位置。

## 5. ターン進行（reducer、純粋関数）

`reducer(state, action)`:

1. **player action**: `MOVE up/down/left/right` または `WAIT`。壁・閉door・guardへは不可。
2. **world resolve**（Law 適用、固定順）:
   - `GRAVITY_DOWN`: looseBlock を落下。
   - `LIGHT_PUSHES_METAL`: lit に乗る metal を押す。
   - `lit` / `watched` を再計算（`MIRRORS_REFLECT_VISION` 反映）。
3. **guard step**: 単純決定的パトロール（経路リスト or 反復往復）。移動後に facing 更新。
4. **detection check**: thief が `watched` 内、かつ `THIEF_HIDDEN_WHILE_STILL` で隠れていない →
   `phase = "caught"`（ゲームオーバー）。
5. **win check**: artifact 取得済みで thief が exit に乗る → `phase = "cleared"` → steal フェーズへ。

- 完全に seed 駆動・決定的。`undo` で1手戻し（プランニング快適性）。

## 6. steal フェーズ

- クリア時、その部屋の `room.laws` を提示。プレイヤーが**1つ選んで** `carriedLaws` に追加。
- 既に持っている Law は選べない（グレーアウト）。
- 次の部屋ロードへ。

## 7. 部屋生成

- 縦切りは**手書き3部屋**（チュートリアル: 視線回避 / 光と金属 / 鏡反射）を JSON で。
- 部屋スキーマ:
  ```ts
  type Room = {
    id: string;
    width: number; height: number;
    cells: CellType[][];        // または "wall map" 文字列
    thiefStart: Pos;
    guards: { pos: Pos; facing: Direction; patrol: Pos[] }[];
    laws: Law[];                // この部屋で掲示・盗用可能な法則
  };
  ```
- 将来: 真の事象（解の存在）をソルバで保証する procgen（BFSで「detectedされず遺物→exit」可達性チェック）。
  縦切りでは可達性チェック関数 `isSolvable(room, carriedLaws)` を BFS で1本だけ実装し、手書き部屋の検証に使う。

## 8. アーキテクチャ（mirror-horde 規約に一致）

```
axiom-heist/
  main.ts              # 配線（dispatch/render/入力）
  core/
    types.ts           # Law, Room, GameState, Action, CellType...
    laws.ts            # Law インタープリタ（id ごとの小関数）
    vision.ts          # 光線/視線トレース（mirror 反射含む）
    reducer.ts         # 純粋ターン進行
    solver.ts          # isSolvable(BFS) ※検証用
    rng.ts             # seed RNG（mirror-horde から流用可）
  content/
    rooms.ts           # 手書き3部屋
    laws.ts            # Law の表示名/説明/グリフ
  ui/
    App.ts             # DOM 要素取得
    BoardView.ts       # セル→座標
    render は main.ts の SVG 描画
  storage/
    save.ts            # localStorage（到達部屋数のベスト）
DESIGN.md
index.html             # ルート（vite base: /arcade/axiom-heist/）
```

- ビルド規約: `vite.config.ts` の `base` を `/arcade/axiom-heist/` に。ルート `index.html` が вход。
  （リポジトリは1ゲーム=1 base。デプロイ時に切替 or ゲームごと config を分ける。現状の
  mirror-horde 設定と衝突するため、axiom-heist 用に別 vite config を用意し `npm run dev:axiom` 等で起動。）
- 描画: SVG、monospace ダークテーマ、`max-width: 420px`、`touch-action: manipulation`。
- 入力: スワイプ/タップ（セルタップで隣接移動）＋ PC は矢印キー。`WAIT` ボタン、`UNDO` ボタン。

## 9. UI / 表示

- 上部 HUD: 部屋名 / ターン / 手持ち Law 数 / Best。
- 盤面: タイルはグリフ（`door=▯ mirror=╱ metal=▦ light=☀ artifact=◆ exit=⌷ guard=●`）。
  `lit` セルは淡い黄、`watched` セルは淡い赤でオーバーレイ。
- 下部: アクティブ Law のリスト（部屋=白 / 手持ち=シアン）。タップで効果説明トースト。
- steal フェーズ: 部屋 Law をカード表示、選択で確定。

## 10. なぜ ~5人月か（充実度）

型付き Law 言語、Law インタープリタ、光/視線トレース（反射）、決定的 guard AI、
可達性ソルバ、procgen、矛盾を活かす難易度カーブ、手持ち Law の恒久効果による
組み合わせ爆発の制御、盤面UI、大量の部屋コンテンツ。各々が独立して重い。

## 11. 縦切りの完了条件（このプロトタイプ）

- [ ] 3部屋を順にクリアでき、各クリアで Law を1つ盗める。
- [ ] 6つの Law が全て盤面で観測可能な効果を持つ（最低でも視線回避・光金属・鏡反射）。
- [ ] guard 視界に入ると caught、遺物取得→exit で cleared。
- [ ] undo / restart 動作。`npm run build`（tsc --noEmit）通過。
- [ ] スマホ縦持ちで操作可能。
```
