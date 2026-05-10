import Phaser from 'phaser';
import type { GameState } from '../../engine/types';

export class RulePanel {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private title: Phaser.GameObjects.Text;
  private lines: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.title = scene.add.text(x, y, 'ルール', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#f4f0d8'
    });
  }

  update(state: GameState): void {
    this.lines.forEach((line) => line.destroy());
    this.lines = [];

    const rules = state.rules.filter((rule) => (rule.visibleFromTurn ?? 0) <= state.turn);
    const visible = rules.length > 0 ? rules.map((rule) => `${rule.title}：${rule.description}`) : ['まだ見えているルールはありません'];

    visible.slice(0, 4).forEach((line, index) => {
      this.lines.push(this.scene.add.text(this.x, this.y + 20 + index * 30, line, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#d8d8e8',
        wordWrap: { width: 330 }
      }));
    });
  }
}
