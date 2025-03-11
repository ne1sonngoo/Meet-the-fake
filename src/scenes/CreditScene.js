class CreditScene extends Phaser.Scene {
    constructor() {
        super( "creditScene" );
    }

    create() {
        this.add.image(0, 0, 'black')
            .setOrigin(0, 0)
            .setDisplaySize(game.config.width, game.config.height);

            this.add.text(400, 100, 'Game Credits', { fontSize: '32px', fill: '#FFFF00' })
            .setOrigin(0.5);
        this.add.text(400, 180, 'Developer: Nelson Ngo', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 230, 'Artist: Nelson Ngo (https://www.pixilart.com/draw) ', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);
        this.add.text(400, 280, 'Sound: Nelson Ngo (https://bigsoundbank.com/microwave-bell-s1631.html)', { fontSize: '24px', fill: '#FFFFFF' })
            .setOrigin(0.5);

        this.add.text(400, 500, 'Press D to return to the Main Menu', { fontSize: '20px', fill: '#FFFF00' })
            .setOrigin(0.5);


        this.input.keyboard.on('keydown-D', () => {
            this.scene.start('menuScene');
        });
    }
}