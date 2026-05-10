import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { PlayScene } from './game/scenes/PlayScene';
import { ResultScene } from './game/scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 375,
  height: 812,
  parent: 'app',
  backgroundColor: '#1a1a2e',
  scene: [BootScene, PlayScene, ResultScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
