class TutorialScene extends Phaser.Scene {
    constructor() {
        super( "tutorialScene" );
    }

    create() {
        this.add.image(0, 0, 'black')
            .setOrigin(0, 0)
            .setDisplaySize(game.config.width, game.config.height);

        this.add.text(400, 100, 'Tutorial', { fontSize: '32px', fill: '#FFFF00' })
            .setOrigin(0.5);
        this.add.text(400, 180, 'Move forward and backwards with W/S', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 230, 'Press SPACE to jump and E to do a flip', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
            this.add.text(400, 280, 'A and D to lean bike (wheelie)', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 330, 'Complete QTE for Power up (infinite jumps and flips)', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 380, 'Lose if you reach 5 broken bonez', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 500, 'Press S to return to the Main Menu', { fontSize: '20px', fill: '#FFFF00' })
            .setOrigin(0.5);

        this.input.keyboard.on('keydown-S', () => {
            this.scene.start('menuScene');
        });
    }
}