class Menu extends Phaser.Scene {
    constructor() {
        super("menuScene");
    }

    preload() {
        this.load.image('menu', 'assets/Menu.png');
        this.load.image('black', 'assets/black.png');
    }

    create() {
        this.add.image(0, 0, 'menu')
            .setOrigin(0, 0)
            .setDisplaySize(game.config.width, game.config.height);
        
        this.add.text(400, 110, 'BROKEN BONEZ', { fontSize: '64px', fill: '#FFFF00' })
            .setOrigin(0.5);
        this.add.text(400, 150, 'Press W to Play', { fontSize: '32px', fill: '#FFFF00' })
            .setOrigin(0.5);
        this.add.text(400, 190, 'Press S for Tutorial', { fontSize: '24px', fill: '#FFFF00' })
            .setOrigin(0.5);
        this.add.text(400, 230, 'Move with "a" & "d" and dodge the obstacles', { fontSize: '20px', fill: '#FFFF00' })
            .setOrigin(0.5);

        this.input.keyboard.on('keydown-W', () => {
            this.scene.start('Play'); 
        });

        this.input.keyboard.on('keydown-S', () => {
            this.scene.start('creditScene');
        });
    }
}