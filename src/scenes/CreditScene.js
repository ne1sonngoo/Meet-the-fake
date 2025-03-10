class CreditScene extends Phaser.Scene {
    constructor() {
        super("creditScene");
    }

    create() {
        this.add.image(0, 0, 'black')
            .setOrigin(0, 0)
            .setDisplaySize(game.config.width, game.config.height);

        this.add.text(400, 100, 'Tutorial', { fontSize: '32px', fill: '#FFFF00' })
            .setOrigin(0.5);
        this.add.text(400, 180, 'Move forward and backwards with W/D', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 230, 'Press SPACE to jump and E to do a flip', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 280, 'Collect 5 broken bonez for a power up with F', { fontSize: '16px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 330, 'Lose if you reach 10 broken bonez', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);

        this.add.text(400, 500, 'Press M to return to the Main Menu', { fontSize: '20px', fill: '#FFFF00' })
            .setOrigin(0.5);

        this.input.keyboard.on('keydown-M', () => {
            this.scene.start('menuScene');
        });
    }
}