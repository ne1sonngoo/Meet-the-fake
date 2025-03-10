const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
      default: 'matter',
      matter: {
          gravity: { y: 1 },
          debug: false
      }
  },
  scene: [ Menu, Play, CreditScene ]
};

let game = new Phaser.Game(config);
