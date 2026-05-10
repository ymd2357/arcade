import Phaser from 'phaser';
import type { GameState } from '../../engine/types';

export class MetricView {
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.text = scene.add.text(x, y, '', {
      fontFamily: 'sans-serif',
      fontSize: '1px',
      color: '#1a1a2e'
    });
  }

  update(state: GameState): void {
    this.text.setText('');
  }
}
