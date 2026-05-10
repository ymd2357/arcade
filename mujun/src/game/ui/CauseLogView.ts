import Phaser from 'phaser';
import type { GameEvent } from '../../engine/types';

const colors: Record<GameEvent['severity'], string> = {
  good: '#72df8c',
  bad: '#ff7373',
  neutral: '#b8bccf'
};

export class CauseLogView {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private title: Phaser.GameObjects.Text;
  private events: GameEvent[] = [];
  private lines: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.title = scene.add.text(x, y, '起きたこと', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#f4f0d8'
    });
  }

  append(events: GameEvent[]): void {
    this.events = [...this.events, ...events].slice(-3);
    this.render();
  }

  clear(): void {
    this.events = [];
    this.render();
  }

  private render(): void {
    this.lines.forEach((line) => line.destroy());
    this.lines = [];

    const visible = this.events.length > 0 ? this.events : [{
      ruleId: '',
      targetId: '',
      severity: 'neutral' as const,
      text: 'まだ何も起きていません'
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
