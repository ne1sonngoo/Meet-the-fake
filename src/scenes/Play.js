class Play extends Phaser.Scene {
    constructor() {
        super({ key: 'Play' });
        this.score = 0;
        this.highScore = 0;
        this.canJump = false;
        this.canJumpAgain = true; // jump cooldown flag
        this.jumpCooldownDuration = 1000; // jump cooldown in ms
        this.lastJumpTime = 0;
        this.isWheelie = false;
        this.wheelieTimeAccum = 0;
        this.doing360 = false;
        this.spinCumulativeRotation = 0;
        this.lastBikeRotation = 0;
        // For broken bonez logic (also used as the power-up meter):
        this.brokenBones = 0;
        this.lastBrokenBoneTime = 0;
        // For power-up activation:
        this.powerUpActive = false;
        this.powerUpDuration = 30000; // 30 seconds
        this.boneMeterThreshold = 5; // Activate power-up at 5 broken bonez
        // For 360 spin cooldown:
        this.canSpin = true;
        this.lastSpinTime = 0;
        this.spinCooldownDuration = 4000; // 4 seconds
    }
    
    preload() {
        this.load.image('background', 'assets/background.png');
        this.load.image('ramp', 'assets/ramp.png');
        this.load.image('bike', 'assets/bike.png');
        // Load audio files.
        this.load.audio('motorcyclerev', 'assets/motorcyclerev.mp3');
        this.load.audio('motorcyclebgm', 'assets/motorcyclebgm.mp3');
    }
    
    create() {
        // Create scrolling background.
        this.background = this.add.tileSprite(
            0, 0,
            this.game.config.width, this.game.config.height,
            'background'
        ).setOrigin(0, 0);
        
        // Score display.
        let savedHighScore = localStorage.getItem('highScore');
        if (savedHighScore !== null) {
            this.highScore = parseInt(savedHighScore, 10);
        }
        this.scoreText = this.add.text(12, 16, 'Score: ' + this.score, { fontSize: '25px', fill: '#FFF' });
        this.highScoreText = this.add.text(200, 16, 'High Score: ' + this.highScore, { fontSize: '25px', fill: '#FFF' });
        // Broken Bonez counter in top right.
        this.brokenBonesText = this.add.text(this.game.config.width - 250, 16, 'Broken Bonez: ' + this.brokenBones, { fontSize: '25px', fill: '#FFF' });
        // Spin cooldown text.
        this.spinCooldownText = this.add.text(12, 50, 'Spin ready', { fontSize: '25px', fill: '#FFF' });
        // Jump cooldown text.
        this.jumpCooldownText = this.add.text(350, 50, 'Jump ready', { fontSize: '25px', fill: '#FFF' });
        // Power-up meter text.
        this.powerUpText = this.add.text(12, 80, 'Power: ' + this.brokenBones + '/' + this.boneMeterThreshold, { fontSize: '25px', fill: '#FFF' });
        
        // Set Matter world bounds.
        this.matter.world.setBounds(0, 0, this.game.config.width, this.game.config.height);
        
        // Create the bike as a Matter sprite.
        this.bike = this.matter.add.sprite(
            100, this.game.config.height - 100,
            'bike', null, { ignoreGravity: false }
        );
        this.bike.setScale(0.5);
        let bikeWidth = this.bike.displayWidth * 0.8;
        let bikeHeight = this.bike.displayHeight * 0.8;
        
        // Create a compound body: main rectangle + thin sensor at the top.
        const { Bodies, Body } = Phaser.Physics.Matter.Matter;
        let mainBody = Bodies.rectangle(this.bike.x, this.bike.y, bikeWidth, bikeHeight, { label: 'mainBody' });
        let topSensor = Bodies.rectangle(this.bike.x, this.bike.y - bikeHeight / 2, bikeWidth, 10, {
            isSensor: true,
            label: 'topSensor'
        });
        let compoundBody = Body.create({
            parts: [mainBody, topSensor],
            friction: 0.005,
            frictionAir: 0.005
        });
        this.bike.setExistingBody(compoundBody);
        this.bike.setOrigin(0.5, 0.5);
        this.bike.mainBody = mainBody;
        this.bike.topSensor = topSensor;
        
        // Collision callback for jump detection:
        // Only allow jump if collision involves the main body.
        this.bike.setOnCollideActive((collisionData) => {
            if (collisionData.bodyA.label !== 'topSensor' && collisionData.bodyB.label !== 'topSensor') {
                this.canJump = true;
            }
        });
        
        // Global collision listener for the top sensor (broken Bonez detection).
        this.matter.world.on('collisionstart', (event) => {
            let now = Date.now();
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                if ((bodyA.label === 'topSensor' || bodyB.label === 'topSensor') && (now - this.lastBrokenBoneTime > 500)) {
                    this.brokenBones++;
                    this.brokenBonesText.setText('Broken Bonez: ' + this.brokenBones);
                    this.lastBrokenBoneTime = now;
                    this.powerUpText.setText('Power: ' + this.brokenBones + '/' + this.boneMeterThreshold);
                }
            });
        });
        
        // Set up keyboard input.
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        // Change power-up activation key to F.
        this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        
        // Create audio: one for revving (for spin) and one for background engine noise.
        this.motorcycleRevSound = this.sound.add('motorcyclerev', { loop: true });
        this.motorcycleBgmSound = this.sound.add('motorcyclebgm', { loop: true });
        // Start background engine noise.
        this.motorcycleBgmSound.play();
        
        // Array to hold ramps.
        this.ramps = [];
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnRamp,
            callbackScope: this,
            loop: true
        });
    }
    
    updateScore(points) {
        if (this.powerUpActive) {
            points *= 2;
        }
        this.score += points;
        this.scoreText.setText('Score: ' + this.score);
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreText.setText('High Score: ' + this.highScore);
            localStorage.setItem('highScore', this.highScore);
        }
    }
    
    spawnRamp() {
        let x = this.game.config.width;
        let y = this.game.config.height;
        // Create the ramp sprite.
        let ramp = this.matter.add.sprite(x, y, 'ramp', null, { ignoreGravity: true });
        ramp.setDisplaySize(150, 50);
        // Set the origin to bottom-left so that (x, y) is the bottom left.
        ramp.setOrigin(0, 1);
        
        // Define the vertices in local coordinates relative to the origin.
        // Bottom left: (0,0), Bottom right: (150,0), Top right: (150,-50)
        const vertices = [
            { x: 0, y: 0 },
            { x: 150, y: 0 },
            { x: 150, y: -50 }
        ];
        
        const { Bodies } = Phaser.Physics.Matter.Matter;
        // Create a body from the vertices.
        let body = Bodies.fromVertices(x, y, vertices, { isStatic: true }, true);
        
        // Assign the custom body to the ramp sprite.
        ramp.setExistingBody(body);
        
        this.ramps.push(ramp);
    }
    
    
    activatePowerUp() {
        this.powerUpActive = true;
        this.bike.setTint(0xff0000);
        // Reset broken Bonez counter.
        this.brokenBones = 0;
        this.brokenBonesText.setText('Broken Bonez: ' + this.brokenBones);
        this.powerUpText.setText('Power: ' + this.brokenBones + '/' + this.boneMeterThreshold);
        this.time.addEvent({
            delay: this.powerUpDuration,
            callback: () => {
                this.powerUpActive = false;
                this.bike.clearTint();
            },
            callbackScope: this
        });
    }
    
    update(time, delta) {
        this.background.tilePositionX += 2;
        
        // Update ramps.
        for (let i = this.ramps.length - 1; i >= 0; i--) {
            let ramp = this.ramps[i];
            ramp.setPosition(ramp.x - 2, ramp.y);
            if (ramp.x + ramp.displayWidth < 0) {
                ramp.destroy();
                this.ramps.splice(i, 1);
            }
        }
        
        // Ground check: using main body's bounds.
        const groundTolerance = 5;
        if (this.bike.body.bounds.max.y >= this.game.config.height - groundTolerance &&
            Math.abs(this.bike.body.velocity.y) < 1) {
            this.canJump = true;
        }
        
        // Jump control with cooldown.
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.canJump && this.canJumpAgain) {
            this.bike.setVelocityY(-10);
            this.canJump = false;
            this.canJumpAgain = false;
            this.lastJumpTime = time;
            this.time.addEvent({
                delay: this.jumpCooldownDuration,
                callback: () => { this.canJumpAgain = true; },
                callbackScope: this
            });
        }
        if (!this.canJumpAgain) {
            let remainingJump = Math.max(0, (this.jumpCooldownDuration - (time - this.lastJumpTime)) / 1000);
            this.jumpCooldownText.setText('Jump cooldown: ' + remainingJump.toFixed(1) + 's');
        } else {
            this.jumpCooldownText.setText('Jump ready');
        }
        
        // Forward thrust with W.
        if (Phaser.Input.Keyboard.JustDown(this.wKey)) {
            let forceX = this.powerUpActive ? 0.02 : 0.01;
            this.bike.applyForce({ x: forceX, y: 0 });
        } else if (this.wKey.isDown) {
            let forceX = this.powerUpActive ? 0.002 : 0.001;
            this.bike.applyForce({ x: forceX, y: 0 });
        }
        
        // Backward thrust with S.
        if (Phaser.Input.Keyboard.JustDown(this.sKey)) {
            this.bike.applyForce({ x: -0.01, y: 0 });
        } else if (this.sKey.isDown) {
            this.bike.applyForce({ x: -0.001, y: 0 });
        }
        
        // Rotation input and auto-correction.
        if (!this.doing360) {
            if (this.aKey.isDown) {
                this.bike.setAngularVelocity(-0.05);
            } else if (this.dKey.isDown) {
                this.bike.setAngularVelocity(0.05);
            } else {
                // No input: auto-correct toward horizontal (0°).
                const targetAngle = 0;
                const currentAngle = this.bike.angle;
                const threshold = 2;
                if (currentAngle < targetAngle - threshold) {
                    this.bike.setAngularVelocity(0.03);
                } else if (currentAngle > targetAngle + threshold) {
                    this.bike.setAngularVelocity(-0.03);
                } else {
                    this.bike.setAngularVelocity(0);
                }
            }
        }
        
        // 360 Spin logic using E key (spin at 1/4 speed with 4-second cooldown).
        if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.canSpin && !this.doing360) {
            this.doing360 = true;
            this.spinCumulativeRotation = 0;
            this.lastBikeRotation = this.bike.rotation;
            this.bike.setAngularVelocity(0.25);
            this.lastSpinTime = time;
            this.canSpin = false;
            // Start rev sound when spin is initiated.
            if (!this.motorcycleRevSound.isPlaying) {
                this.motorcycleRevSound.play();
            }
            // Stop the background engine sound.
            if (this.motorcycleBgmSound.isPlaying) {
                this.motorcycleBgmSound.stop();
            }
            this.time.addEvent({
                delay: this.spinCooldownDuration,
                callback: () => { this.canSpin = true; },
                callbackScope: this
            });
        }
        if (this.doing360) {
            let currentRotation = this.bike.rotation;
            let deltaRotation = Phaser.Math.Angle.Wrap(currentRotation - this.lastBikeRotation);
            this.spinCumulativeRotation += Math.abs(deltaRotation);
            this.lastBikeRotation = currentRotation;
            if (this.spinCumulativeRotation >= Math.PI * 2) {
                this.bike.setAngularVelocity(0);
                this.doing360 = false;
                // Stop rev sound and resume background sound.
                if (this.motorcycleRevSound.isPlaying) {
                    this.motorcycleRevSound.stop();
                }
                if (!this.motorcycleBgmSound.isPlaying) {
                    this.motorcycleBgmSound.play();
                }
                let pointsAwarded = 50;
                if (this.bike.body.bounds.max.y < this.game.config.height - groundTolerance) {
                    pointsAwarded *= 2;
                }
                this.updateScore(pointsAwarded);
            }
        }
        
        // Update spin cooldown text.
        if (!this.canSpin) {
            let remaining = Math.max(0, (this.spinCooldownDuration - (time - this.lastSpinTime)) / 1000);
            this.spinCooldownText.setText('Spin cooldown: ' + remaining.toFixed(1) + 's');
        } else {
            this.spinCooldownText.setText('Spin ready');
        }
        
        // Continuous wheelie scoring for both rear and front wheelies.
        if (Math.abs(this.bike.angle) > 15) {
            if (!this.isWheelie) {
                this.isWheelie = true;
                this.wheelieTimeAccum = 0;
            } else {
                this.wheelieTimeAccum += delta;
                if (this.wheelieTimeAccum >= 1000) {
                    let bonusPoints = Math.floor(this.wheelieTimeAccum / 1000) * 10;
                    if (this.powerUpActive) bonusPoints *= 2;
                    this.updateScore(bonusPoints);
                    this.wheelieTimeAccum %= 1000;
                }
            }
        } else {
            this.isWheelie = false;
            this.wheelieTimeAccum = 0;
        }
        
        // Power-up activation: if F is pressed and brokenBonez threshold is reached.
        if (Phaser.Input.Keyboard.JustDown(this.fKey) && this.brokenBones >= this.boneMeterThreshold && !this.powerUpActive) {
            this.activatePowerUp();
        }
        
        // Update power-up meter text.
        this.powerUpText.setText('Power: ' + this.brokenBones + '/' + this.boneMeterThreshold);
    }
}
