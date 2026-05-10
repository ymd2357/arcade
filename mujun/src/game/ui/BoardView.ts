import Phaser from 'phaser';
import type { GameObject, GameState } from '../../engine/types';

const traitLabels: Record<string, string> = {
  flower: '花',
  water: '水',
  stone: '石',
  bird: '鳥',
  wet: '濡',
  dry: '乾',
  alive: '生',
  hidden: '隠',
  mirror: '鏡',
  gate: '門',
  shadow: '影',
  observed: '見'
};

export class BoardView {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private cellSize: number;
  private cells: Phaser.GameObjects.Rectangle[] = [];
  private objectTexts: Phaser.GameObjects.Text[] = [];
  private onObjectSelected: (object: GameObject) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onObjectSelected: (object: GameObject) => void
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.cellSize = 58;
    this.onObjectSelected = onObjectSelected;

    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const cell = scene.add.rectangle(
          x + col * this.cellSize,
          y + row * this.cellSize,
          this.cellSize - 4,
          this.cellSize - 4,
          0x242447
        ).setOrigin(0);
        cell.setStrokeStyle(1, 0x5c668f, 0.9);
        this.cells.push(cell);
      }
    }
  }

  update(state: GameState): void {
    this.objectTexts.forEach((text) => text.destroy());
    this.objectTexts = [];

    for (const object of state.objects) {
      const label = traitLabels[object.traits[0]] ?? object.traits[0]?.slice(0, 1) ?? '?';
      const text = this.scene.add.text(
        this.x + object.x * this.cellSize + this.cellSize / 2 - 2,
        this.y + object.y * this.cellSize + this.cellSize / 2 - 2,
        label,
        {
          fontFamily: 'sans-serif',
          fontSize: '24px',
          color: object.stability <= 0 ? '#9a9a9a' : '#ffffff'
        }
      ).setOrigin(0.5);

      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.onObjectSelected(object));
      this.objectTexts.push(text);
    }
  }
}
