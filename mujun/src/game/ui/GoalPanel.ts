import Phaser from 'phaser';
import type { GameState } from '../../engine/types';

export class GoalPanel {
  private title: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.title = scene.add.text(x, y, '目標', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#f4f0d8'
    });
    this.text = scene.add.text(x, y + 18, '', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#d8d8e8',
      wordWrap: { width: 210 }
    });
  }

  update(state: GameState): void {
    const goals: string[] = [];
    if (state.winCondition.minLife >= 1) goals.push('花を残す');
    if (state.winCondition.minStability >= 3) goals.push('庭を壊さない');
    goals.push(`${state.winCondition.afterTurns}ターン耐える`);

    this.text.setText(goals.join(' / '));
  }
}
