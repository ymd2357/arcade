import Phaser from 'phaser';
import type { GameState } from '../../engine/types';
import { describeFailure } from '../../explain/describeFailure';
import { saveClearedStage } from '../../storage/progressStore';

type ResultSceneData = {
  stageIndex?: number;
  stageId?: string;
  state?: GameState;
};

export class ResultScene extends Phaser.Scene {
  private stageIndex = 0;

  constructor() {
    super('ResultScene');
  }

  create(data: ResultSceneData): void {
    this.stageIndex = data.stageIndex ?? 0;
    const state = data.state;
    const won = state?.status === 'win';

    this.cameras.main.setBackgroundColor('#1a1a2e');

    if (won && data.stageId) {
      saveClearedStage(data.stageId);
    }

    this.add.text(187, 230, won ? 'クリア！' : describeFailure(state as GameState), {
      fontFamily: 'sans-serif',
      fontSize: won ? '28px' : '18px',
      color: won ? '#72df8c' : '#ff7373',
      align: 'center',
      wordWrap: { width: 310 }
    }).setOrigin(0.5);

    const retryButton = this.add.text(128, 420, 'もう一度', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#1a1a2e',
      backgroundColor: '#f4f0d8',
      padding: { left: 30, right: 30, top: 10, bottom: 10 }
    });
    retryButton.setInteractive({ useHandCursor: true });
    retryButton.on('pointerdown', () => {
      this.scene.start('PlayScene', { stageIndex: this.stageIndex });
    });
  }
}
