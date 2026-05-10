import Phaser from 'phaser';
import { createInitialState } from '../../engine/createInitialState';
import { simulateTurn } from '../../engine/simulateTurn';
import type { GameObject, GameState, StageData, ThoughtCard, Trait } from '../../engine/types';
import { evaluateRules } from '../../engine/evaluateRules';
import { getStage } from '../../levels';
import { BoardView } from '../ui/BoardView';
import { CardHandView } from '../ui/CardHandView';
import { CauseLogView } from '../ui/CauseLogView';
import { GoalPanel } from '../ui/GoalPanel';
import { MetricView } from '../ui/MetricView';
import { PredictionPanel } from '../ui/PredictionPanel';
import { RulePanel } from '../ui/RulePanel';

type PlaySceneData = {
  stageIndex?: number;
};

export class PlayScene extends Phaser.Scene {
  private stage!: StageData;
  private stageIndex = 0;
  private state!: GameState;
  private selectedCardType: ThoughtCard['type'] | null = null;
  private pendingCard: ThoughtCard | null = null;
  private turnText!: Phaser.GameObjects.Text;
  private pendingText!: Phaser.GameObjects.Text;
  private boardView!: BoardView;
  private cardHandView!: CardHandView;
  private causeLogView!: CauseLogView;
  private goalPanel!: GoalPanel;
  private metricView!: MetricView;
  private predictionPanel!: PredictionPanel;
  private rulePanel!: RulePanel;

  constructor() {
    super('PlayScene');
  }

  create(data: PlaySceneData): void {
    this.stageIndex = data.stageIndex ?? 0;
    this.stage = getStage(this.stageIndex);
    this.state = createInitialState(this.stage);
    this.selectedCardType = null;
    this.pendingCard = null;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.turnText = this.add.text(18, 14, '', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffffff'
    });
    this.add.text(18, 38, this.stage.title, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#b8bccf',
      wordWrap: { width: 130 }
    });

    this.goalPanel = new GoalPanel(this, 150, 14);
    this.boardView = new BoardView(this, 72, 88, (object) => this.selectObject(object));
    this.predictionPanel = new PredictionPanel(this, 18, 342);
    this.causeLogView = new CauseLogView(this, 18, 430);
    this.rulePanel = new RulePanel(this, 18, 520);
    this.cardHandView = new CardHandView(this, 18, 658, (type) => {
      this.selectedCardType = type;
      this.pendingCard = null;
      this.updatePendingText();
    });
    this.metricView = new MetricView(this, 0, 0);
    this.pendingText = this.add.text(18, 730, '', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#f4f0d8',
      wordWrap: { width: 330 }
    });

    const nextButton = this.add.text(108, 762, '次のターン', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#1a1a2e',
      backgroundColor: '#f4f0d8',
      padding: { left: 28, right: 28, top: 10, bottom: 10 }
    });
    nextButton.setInteractive({ useHandCursor: true });
    nextButton.on('pointerdown', () => this.nextTurn());

    this.causeLogView.clear();
    this.render();
  }

  private selectObject(object: GameObject): void {
    if (!this.selectedCardType) return;

    const card = this.createCardForObject(this.selectedCardType, object);
    if (!card) return;

    this.pendingCard = card;
    this.cardHandView.clearSelection();
    this.selectedCardType = null;
    this.updatePendingText();
  }

  private createCardForObject(type: ThoughtCard['type'], object: GameObject): ThoughtCard | null {
    const ruleId = this.pickRuleId(object);

    if (type === 'delay') {
      return { type, ruleId, turns: 1 };
    }

    if (type === 'exception') {
      return { type, ruleId, target: object.id };
    }

    if (type === 'sacrifice') {
      const trait = this.pickSacrificeTrait(object);
      return trait ? { type, target: object.id, trait } : null;
    }

    if (type === 'split') return { type, target: object.id };
    if (type === 'name') return { type, target: object.id, trait: 'observed' };
    if (type === 'invert') return { type, ruleId };

    return null;
  }

  private pickRuleId(object: GameObject): string {
    const predictions = evaluateRules(this.state, { dryRun: true });
    const related = predictions.find((event) => event.targetId === object.id);
    return related?.ruleId ?? predictions[0]?.ruleId ?? this.state.rules[0]?.id ?? '';
  }

  private pickSacrificeTrait(object: GameObject): Trait | null {
    return object.traits.find((trait) => trait === 'wet' || trait === 'dry')
      ?? object.traits.find((trait) => trait !== 'flower' && trait !== 'alive')
      ?? object.traits[0]
      ?? null;
  }

  private nextTurn(): void {
    if (this.state.status !== 'playing') return;

    const result = simulateTurn(this.state, this.pendingCard);
    this.state = result.nextState;
    this.pendingCard = null;
    this.causeLogView.append(result.events);
    this.render();

    if (this.state.status !== 'playing' || this.state.turn >= this.state.maxTurns) {
      this.scene.start('ResultScene', {
        stageIndex: this.stageIndex,
        stageId: this.stage.id,
        state: this.state
      });
    }
  }

  private render(): void {
    this.turnText.setText(`Turn ${this.state.turn}/${this.state.maxTurns}`);
    this.goalPanel.update(this.state);
    this.boardView.update(this.state);
    this.predictionPanel.update(this.state);
    this.rulePanel.update(this.state);
    this.cardHandView.update(this.state);
    this.metricView.update(this.state);
    this.updatePendingText();
  }

  private updatePendingText(): void {
    if (!this.pendingText) return;

    if (this.pendingCard) {
      this.pendingText.setText(`選択中：${this.pendingCard.type}`);
      return;
    }

    this.pendingText.setText(this.selectedCardType ? '対象を選んでください' : '');
  }
}
