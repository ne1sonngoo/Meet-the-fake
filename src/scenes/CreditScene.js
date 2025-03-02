class CreditScene extends Phaser.Scene {
    constructor() {
        super("creditScene");
    }

    create() {
        this.add.image(0, 0, 'background')
            .setOrigin(0, 0)
            .setDisplaySize(game.config.width, game.config.height);

        this.add.text(400, 100, 'Game Credits', { fontSize: '32px', fill: '#FFFF00' })
            .setOrigin(0.5);
        this.add.text(400, 180, 'Developer: Nelson Ngo', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 230, 'Artist: Nelson Ngo (https://www.pixilart.com/draw) ', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 280, 'Music: Nelson Ngo (https://pixabay.com/music/search/no%20copyright%20music/)', { fontSize: '16px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 330, 'Sound: Normandy Chad Balza', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);

        this.add.text(400, 500, 'Press M to return to the Main Menu', { fontSize: '20px', fill: '#FFFF00' })
            .setOrigin(0.5);

        this.input.keyboard.on('keydown-M', () => {
            this.scene.start('menuScene');
        });
    }
}