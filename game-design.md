# 『矛盾庭』ゲームデザイン

## 結論

アーキテクチャは「スマホブラウザで動く、1画面・ターン制・記号シミュレーション型パズル」が最適。

完全に先行例がないことは未確認。近い先行例として、Baba Is You は
「ゲーム内のルールそのものを物体として操作する」パズル。
そこから外すなら、ルールの組み替えではなく、
**矛盾、例外、遅延、抽象化をリソースとして扱うゲーム** にする。

## 提案ゲーム：『矛盾庭』

プレイヤーは庭師。花、水、石、鏡、影、門、鳥などの小さなオブジェクトが、互いに矛盾した性質を持っている。

例:

- 「水は花を育てる」
- 「花は濡れると消える」
- 「鏡は隣のものを観測する」
- 「影は観測されると本体になる」
- 「門は閉じている時だけ通れる」

プレイヤーはオブジェクトを動かすのではなく、**解釈を変える**。
勝利条件は「矛盾を消す」ではなく、**矛盾を壊れない形で保つこと**。

論理、逆説、抽象化、システム思考をゲームの中核にしつつ、画面操作は軽くできる。

## 体験の核

- 1プレイは 3〜5 分
- 画面は 4×4 マス
- 操作はタップだけ

各ステージで「思考カード」を 3 枚だけ使える。

| カード | 効果 |
| --- | --- |
| 分ける | 1 つのオブジェクトを「見える側」と「隠れた側」に分ける |
| 反転 | 1 つの関係だけ原因と結果を反転する |
| 遅延 | 効果を 1 ターン遅らせる |
| 例外 | 1 つの対象だけルールから外す |
| 名づけ | オブジェクトに新しい性質タグを付ける |
| 捨てる | 1 つの価値を犠牲にして安定度を上げる |

勝利条件は、7 ターン後に以下を満たすこと。

| 指標 | 意味 |
| --- | --- |
| 安定度 | システムが崩壊していない |
| 緊張度 | 矛盾が残っている |
| 生命度 | 庭が死んでいない |
| 余白 | 使っていない解釈の可能性が残っている |

「全部きれいに解く」と負ける。
「矛盾が多すぎる」と崩壊する。
**中途半端な均衡を設計するゲーム**。

## なぜ新しく見えるか

既存の論理パズルは、多くが「正解に到達する」構造。
このゲームは、正解ではなく **許容可能な矛盾状態** を作る。

| 従来のパズル | 『矛盾庭』 |
| --- | --- |
| ルールを発見する | ルールの解釈を編集する |
| 矛盾をなくす | 矛盾を利用する |
| ゴールに到達する | システムを生存させる |
| 1 つの正解を探す | 複数の安定解を設計する |
| ステージを攻略する | 状態をマネジメントする |

## 推奨アーキテクチャ

```text
スマホブラウザ
  ↓
Phaser + TypeScript + Vite
  ↓
Game Scene
  ↓
Pure Simulation Engine
  ↓
Level JSON
  ↓
localStorage / IndexedDB
  ↓
任意：Supabase
```

### 1. フロントエンド

Phaser + TypeScript + Vite。

Phaser はデスクトップとモバイルブラウザ向けの HTML5 ゲームフレームワークで、Canvas と WebGL レンダリングに対応。スマホブラウザゲームに向く。
Vite は JavaScript / TypeScript のテンプレートをサポート。最小構成で始めやすい。

React は不要。画面遷移やフォームが多いゲームではないので、Phaser 内で完結させた方が小さく作れる。

### 2. ゲームエンジン

Phaser にロジックを混ぜない。
ゲームの中核は、描画から独立した **純粋な TypeScript 関数**。

```ts
type ObjectId = string;

type Trait =
  | "wet"
  | "dry"
  | "alive"
  | "hidden"
  | "observed"
  | "mirror"
  | "gate"
  | "shadow"
  | "flower"
  | "stone";

type GameObject = {
  id: ObjectId;
  x: number;
  y: number;
  traits: Trait[];
  energy: number;
  stability: number;
};

type Rule = {
  id: string;
  condition: Condition;
  effect: Effect;
  priority: number;
};

type ThoughtCard =
  | { type: "split"; target: ObjectId }
  | { type: "invert"; ruleId: string }
  | { type: "delay"; ruleId: string; turns: number }
  | { type: "exception"; ruleId: string; target: ObjectId }
  | { type: "name"; target: ObjectId; trait: Trait }
  | { type: "sacrifice"; target: ObjectId; trait: Trait };

type GameState = {
  turn: number;
  objects: GameObject[];
  rules: Rule[];
  delayedEffects: Effect[];
  usedCards: ThoughtCard[];
  metrics: {
    stability: number;
    tension: number;
    life: number;
    openness: number;
  };
};
```

描画は Phaser、判定は TypeScript、ステージは JSON。この分離が重要。

## ステージ定義

ステージはコードではなく JSON で作る。

```json
{
  "id": "stage_001",
  "title": "濡れると消える花",
  "turnLimit": 7,
  "objects": [
    {
      "id": "flower",
      "x": 1,
      "y": 1,
      "traits": ["flower", "alive"],
      "energy": 3,
      "stability": 3
    },
    {
      "id": "water",
      "x": 2,
      "y": 1,
      "traits": ["wet"],
      "energy": 3,
      "stability": 3
    },
    {
      "id": "mirror",
      "x": 1,
      "y": 2,
      "traits": ["mirror"],
      "energy": 2,
      "stability": 2
    }
  ],
  "rules": [
    {
      "id": "water_grows_flower",
      "condition": { "near": ["wet", "flower"] },
      "effect": { "targetTrait": "flower", "energyDelta": 1 },
      "priority": 1
    },
    {
      "id": "wet_flower_disappears",
      "condition": { "hasTraits": ["flower", "wet"] },
      "effect": { "targetTrait": "flower", "stabilityDelta": -3 },
      "priority": 2
    }
  ],
  "availableCards": ["split", "delay", "exception"],
  "winCondition": {
    "afterTurns": 7,
    "minStability": 4,
    "minTension": 2,
    "minLife": 3
  }
}
```

この構造なら 1 人でもステージを量産できる。コードを書かずにパラメータ調整で難易度を作れる。

## シミュレーション処理

1 ターンの処理は固定する。

1. プレイヤーが思考カードを使う
2. ルールを優先度順に評価する
3. 遅延効果をキューに入れる
4. オブジェクトの状態を更新する
5. 安定度、緊張度、生命度、余白を計算する
6. 崩壊判定または勝利判定を行う

重要なのは、**自然言語処理を使わない** こと。言葉っぽく見せるが、中身はタグとルールの組み合わせ。これで実装規模を抑えられる。

## 画面設計

スマホ縦画面。

```text
┌────────────────┐
│ ステージ名      │
│ 安定 4 緊張 3   │
├────────────────┤
│ □ □ □ □        │
│ □ 花 水 □      │
│ □ 鏡 影 □      │
│ □ □ 門 □       │
├────────────────┤
│ 分ける  遅延    │
│ 例外    捨てる  │
├────────────────┤
│ 7ターン中 3     │
└────────────────┘
```

UI は軽くする。

| 要素 | 方針 |
| --- | --- |
| グラフィック | 記号、線、単色アイコン中心 |
| アニメーション | 状態変化だけを短く見せる |
| テキスト | 1 ステージあたり 3 行以内 |
| サウンド | 最初はなしでも成立 |
| 操作 | タップ、長押し、ドラッグなしでも可 |

## 保存と配信

最初はオフライン対応の静的サイトで十分。

- Web Storage API はブラウザでキーと値を保存する仕組み。進行状況だけならこれで足りる。
- ステージエディタ、リプレイ、ユーザー投稿を持つなら、構造化データを扱える IndexedDB に移行する。
- PWA（インストール可能な Web アプリ）にすると、サービスワーカーで一部リソースをキャッシュし、オフライン動作を作れる。

## オンライン機能は後回し

最初からサーバーを入れない。入れるなら Supabase を後付けする。

Supabase は Postgres データベース、認証、Edge Functions、
Realtime subscriptions などを提供する。
Realtime には Broadcast、Presence、Postgres Changes があり、
ゲームイベント、オンライン状態、データベース変更の購読に使える。

使い道はこの程度に絞る。

| 機能 | 使い道 |
| --- | --- |
| Daily Stage | 今日の 1 問 |
| Replay Share | 解法共有 |
| Tiny Ranking | 使用カード数、安定度、緊張度 |
| Level Share | ユーザー投稿ステージ |

リアルタイム対戦は不要。このゲームの価値は競争ではなく、**解釈の美しさ**。

## Godot 案との比較

Godot でも作れる。HTML5 エクスポートはブラウザ公開が可能だが、WebAssembly と WebGL 2.0 対応が必要。

今回の要件では、Godot より Phaser + TypeScript が向いている。

| 観点 | Phaser | Godot |
| --- | --- | --- |
| スマホブラウザ適性 | 高い | 中 |
| 軽量さ | 高い | 中 |
| 1 人開発 | 高い | 高い |
| ロジック分離 | 高い | 中 |
| 組み込みやすさ | 高い | 中 |
| エディタの便利さ | 中 | 高い |
| 今回の相性 | 高い | 中 |

Godot は、ビジュアル演出やエディタ作業を重視する場合に選ぶ。今回のゲームは「記号」「状態」「ルール」が主役なので、Web 技術で軽く作る方が合う。

## MVP 範囲

最初の完成形はここまでに絞る。

| 項目 | 内容 |
| --- | --- |
| ステージ数 | 12 個 |
| マス | 4×4 固定 |
| オブジェクト | 8 種類 |
| 思考カード | 6 種類 |
| 勝利指標 | 安定度、緊張度、生命度 |
| 保存 | クリア済みステージだけ |
| サーバー | なし |
| 課金 | なし |
| 音 | なしでも可 |

最初から広げない。**1 つの良いステージが 100 個の凡庸なステージより価値を持つ**。

## 最初の 3 ステージ案

### 1. 濡れると消える花

- 水は花を育てる
- 花は濡れると消える

プレイヤーは「遅延」か「例外」を使って、花を 7 ターン生かす。
学ばせること: 矛盾を消さずに時間差で扱う。

### 2. 見られると本物になる影

- 影は観測されると本体になる
- 鏡は隣を観測する
- 本体が 2 つあると庭が崩壊する

学ばせること: 観測が価値でもリスクでもある。

### 3. 閉じている時だけ通れる門

- 門は閉じている時だけ通れる
- 鳥は開いた場所だけ進める
- 石は門を閉じるが、道をふさぐ

学ばせること: 状態の反転と例外処理。

## 収益化するなら

最初は無料で出して、反応を見る。

| 段階 | 方式 |
| --- | --- |
| 1 | 無料公開 |
| 2 | 追加ステージパック |
| 3 | ステージエディタ |
| 4 | 投稿ステージのキュレーション |
| 5 | 有料版または買い切り |

広告は相性が悪い。このゲームは短時間でも思考密度が高いので、広告で中断すると価値が落ちる。

## 実装順

1. TypeScript だけでシミュレーションエンジンを作る
2. JSON ステージを 1 個作る
3. コンソール上で 7 ターンの勝敗判定を確認する
4. Phaser で 4×4 盤面を表示する
5. 思考カードをタップで適用する
6. ステージを 12 個作る
7. スマホで操作感を調整する
8. PWA 化する
9. デイリーステージや共有機能を検討する

**最初に描画を作らない**。面白さは絵ではなく、状態遷移が気持ち悪くも納得できるかで決まる。

## 最小コード構成

```text
src/
  main.ts
  game/
    scenes/
      BootScene.ts
      PlayScene.ts
      ResultScene.ts
    ui/
      BoardView.ts
      CardHandView.ts
      MetricView.ts
  engine/
    types.ts
    simulateTurn.ts
    applyThoughtCard.ts
    evaluateRules.ts
    calculateMetrics.ts
    checkWin.ts
  levels/
    stage_001.json
    stage_002.json
    stage_003.json
  storage/
    progressStore.ts
  assets/
    icons/
```

- `engine/` は Phaser を import しない
- `game/` は engine を呼ぶだけ

この分離で、バグ修正とステージ調整がかなり楽になる。

## 最終コンセプト

『矛盾庭』は、矛盾を解決するゲームではなく、**矛盾を生かすゲーム**。

世界観よりも構造で差別化する: 抽象、逆説、システム、定義、例外、遅延。
これらをスマホで 3 分触れる形に圧縮する。

作るなら、まずは:

- Phaser + TypeScript + Vite
- サーバーなし
- 4×4 盤面
- 12 ステージ
- 6 枚の思考カード

ここまでで成立させるのが最も強い。
