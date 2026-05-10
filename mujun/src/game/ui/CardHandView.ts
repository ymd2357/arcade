import Phaser from 'phaser';
import { describeCardEffect } from '../../explain/describeCardEffect';
import type { GameState, ThoughtCard } from '../../engine/types';

const labels: Record<ThoughtCard['type'], string> = {
  split: '分ける',
  invert: '反転',
  delay: '待つ',
  exception: '無視',
  name: '名付け',
  sacrifice: '消す'
};

export class CardHandView {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private title: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedType: ThoughtCard['type'] | null = null;
  private onSelect: (type: ThoughtCard['type'] | null) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onSelect: (type: ThoughtCard['type'] | null) => void
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.onSelect = onSelect;
    this.title = scene.add.text(x, y, 'カード', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#f4f0d8'
    });
  }

  update(state: GameState): void {
    this.buttons.forEach((button) => button.destroy());
    this.buttons = [];

    state.availableCards.forEach((type, index) => {
      const selected = type === this.selectedType;
      const button = this.scene.add.text(this.x + index * 82, this.y + 22, labels[type], {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: selected ? '#1a1a2e' : '#ffffff',
        backgroundColor: selected ? '#f4f0d8' : '#3a3d64',
        padding: { left: 10, right: 10, top: 7, bottom: 7 }
      });
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        this.selectedType = this.selectedType === type ? null : type;
        this.onSelect(this.selectedType);
        this.update(state);
      });
      this.buttons.push(button);
    });

    const help = this.scene.add.text(this.x, this.y + 58, `残り${state.cardUsesLeft}回 ${this.selectedType ? describeCardEffect(this.selectedType) : ''}`, {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#b8bccf',
      wordWrap: { width: 330 }
    });
    this.buttons.push(help);
  }

  clearSelection(): void {
    this.selectedType = null;
  }
}
