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

function cellColor(object: GameObject): number {
  if (object.traits.includes('flower')) return 0x1a3320;
  if (object.traits.includes('water')) return 0x0d1f3c;
  return 0x242447;
}

function labelColor(object: GameObject): string {
  if (object.traits.includes('flower')) {
    const ratio = Math.max(0, object.stability) / 6;
    if (ratio > 0.6) return '#7fff7f';
    if (ratio > 0.3) return '#ffdd44';
    return '#ff6644';
  }
  if (object.traits.includes('water')) return '#66bbff';
  return '#ffffff';
}

export class BoardView {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private cellSize: number;
  private cells: Phaser.GameObjects.Rectangle[] = [];
  private objectLayers: Phaser.GameObjects.GameObject[] = [];
  private onObjectSelected: (object: GameObject) => void;
  private cardActive = false;
  private pendingObjectId: string | null = null;

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

  setInteractionMode(cardActive: boolean, pendingObjectId: string | null = null): void {
    this.cardActive = cardActive;
    this.pendingObjectId = pendingObjectId;
  }

  update(state: GameState): void {
    this.objectLayers.forEach((obj) => obj.destroy());
    this.objectLayers = [];

    // Reset all cell colors and borders
    this.cells.forEach((cell) => {
      cell.setFillStyle(0x242447);
      cell.setStrokeStyle(1, 0x5c668f, 0.9);
    });

    for (const object of state.objects) {
      const cx = this.x + object.x * this.cellSize;
      const cy = this.y + object.y * this.cellSize;
      const cellIdx = object.y * 4 + object.x;
      const cell = this.cells[cellIdx];

      // Cell background by object type
      cell.setFillStyle(cellColor(object));

      // Pending target: bright gold border
      if (this.pendingObjectId === object.id) {
        cell.setStrokeStyle(3, 0xffcc00, 1);
      } else if (this.cardActive && object.traits.includes('flower')) {
        // Card active + flower: show as selectable target (cyan border)
        cell.setStrokeStyle(2, 0x44ddff, 1);
      }

      const label = traitLabels[object.traits[0]] ?? object.traits[0]?.slice(0, 1) ?? '?';

      // Main label
      const text = this.scene.add.text(
        cx + this.cellSize / 2,
        cy + this.cellSize / 2 - 6,
        label,
        {
          fontFamily: 'sans-serif',
          fontSize: '22px',
          color: labelColor(object)
        }
      ).setOrigin(0.5);

      // Stability number for flowers
      if (object.traits.includes('flower')) {
        const stabText = this.scene.add.text(
          cx + this.cellSize / 2,
          cy + this.cellSize - 12,
          `♥${Math.max(0, object.stability)}`,
          {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: labelColor(object)
          }
        ).setOrigin(0.5);
        this.objectLayers.push(stabText);
      }

      // Wet indicator on flowers
      if (object.traits.includes('flower') && object.traits.includes('wet')) {
        const wetMark = this.scene.add.text(
          cx + this.cellSize - 8,
          cy + 4,
          '濡',
          { fontFamily: 'sans-serif', fontSize: '10px', color: '#66bbff' }
        ).setOrigin(1, 0);
        this.objectLayers.push(wetMark);
      }

      // Hit area (larger than text for easy tapping)
      const hitArea = this.scene.add.rectangle(
        cx + this.cellSize / 2,
        cy + this.cellSize / 2,
        this.cellSize - 6,
        this.cellSize - 6,
        0x000000,
        0
      ).setOrigin(0.5);
      hitArea.setInteractive({ useHandCursor: this.cardActive });
      hitArea.on('pointerdown', () => this.onObjectSelected(object));
      if (this.cardActive && object.traits.includes('flower')) {
        hitArea.on('pointerover', () => cell.setStrokeStyle(3, 0xffffff, 1));
        hitArea.on('pointerout', () => {
          if (this.pendingObjectId === object.id) {
            cell.setStrokeStyle(3, 0xffcc00, 1);
          } else {
            cell.setStrokeStyle(2, 0x44ddff, 1);
          }
        });
      }

      this.objectLayers.push(text, hitArea);
    }
  }
}
