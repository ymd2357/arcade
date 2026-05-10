import Phaser from 'phaser';
import { predictNextEvents } from '../../explain/predictNextEvents';
import type { GameState, PredictedEvent } from '../../engine/types';

const colors: Record<PredictedEvent['severity'], string> = {
  good: '#72df8c',
  bad: '#ff7373',
  neutral: '#b8bccf'
};

export class PredictionPanel {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private title: Phaser.GameObjects.Text;
  private lines: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.title = scene.add.text(x, y, '次に起きること', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#f4f0d8'
    });
  }

  update(state: GameState): void {
    this.lines.forEach((line) => line.destroy());
    this.lines = [];

    const predictions = predictNextEvents(state).slice(0, 4);
    const visible = predictions.length > 0 ? predictions : [{
      ruleId: '',
      targetId: '',
      severity: 'neutral' as const,
      text: '何も起きません'
    }];

    visible.forEach((event, index) => {
      this.lines.push(this.scene.add.text(this.x, this.y + 20 + index * 18, event.text, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: colors[event.severity],
        wordWrap: { width: 330 }
      }));
    });
  }
}
