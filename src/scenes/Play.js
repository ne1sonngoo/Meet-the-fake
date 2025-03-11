class Play extends Phaser.Scene {
    constructor() {
        super({ key: 'Play' });
        // Game state variables (will be reset in init())
        this.score = 0;
        this.highScore = 0;
        this.canJump = false;
        this.canJumpAgain = true;
        this.jumpCooldownDuration = 1000;
        this.lastJumpTime = 0;
        this.isWheelie = false;
        this.wheelieTimeAccum = 0;
        this.doing360 = false;
        this.spinCumulativeRotation = 0;
        this.lastBikeRotation = 0;
        this.brokenBones = 0;            // Loss occurs if brokenBones reaches 5
        this.lastBrokenBoneTime = 0;
        this.powerUpActive = false;      // When active, unlimited jumps/flips
        this.boneMeterThreshold = 5;     // Not used for acquiring power-ups anymore
        this.canSpin = true;
        this.lastSpinTime = 0;
        this.spinCooldownDuration = 4000;
        this.gameOverFlag = false;
        this.powerUpDuration = 5000;     // Power-up lasts 5 seconds.
        // Power-up inventory: You can only hold 1 at a time.
        this.powerUpCount = 0;
        // --- QTE Properties ---
        this.qteActive = false;
        this.qteSequence = [];
        this.qteIndex = 0;
        // We'll use two text objects for QTE:
        // one for the full sequence and one for the instruction (current key highlighted in red).
        this.qteSequenceText = null;
        this.qteInstructionText = null;
        this.qteTimerEvent = null;
    }
    
    init() {
        // Reset game state variables on scene start/restart.
        this.score = 0;
        this.brokenBones = 0;
        this.gameOverFlag = false;
        this.canJump = false;
        this.canJumpAgain = true;
        this.lastJumpTime = 0;
        this.isWheelie = false;
        this.wheelieTimeAccum = 0;
        this.doing360 = false;
        this.spinCumulativeRotation = 0;
        this.lastBikeRotation = 0;
        this.canSpin = true;
        this.lastSpinTime = 0;
        this.powerUpCount = 0;
        // Reset QTE state.
        this.qteActive = false;
        this.qteSequence = [];
        this.qteIndex = 0;
        if (this.qteSequenceText) { this.qteSequenceText.destroy(); this.qteSequenceText = null; }
        if (this.qteInstructionText) { this.qteInstructionText.destroy(); this.qteInstructionText = null; }
        if (this.qteTimerEvent) { this.qteTimerEvent.remove(false); this.qteTimerEvent = null; }
    }
    
    preload() {
        // Load assets.
        this.load.image('background', 'assets/background.png');
        this.load.image('ramp', 'assets/ramp.png');
        this.load.image('bike', 'assets/bike.png');
        this.load.audio('motorcyclerev', 'assets/motorcyclerev.mp3');
        this.load.audio('motorcyclebgm', 'assets/motorcyclebgm.mp3');
        this.load.audio('ding', 'assets/Ding.mp3');
    }
    
    create() {
        // Create scrolling background.
        this.background = this.add.tileSprite(0, 0, this.game.config.width, this.game.config.height, 'background').setOrigin(0, 0);
        
        let savedHighScore = localStorage.getItem('highScore');
        if (savedHighScore !== null) { this.highScore = parseInt(savedHighScore, 10); }
        this.scoreText = this.add.text(12, 16, 'Score: ' + this.score, { fontSize: '25px', fill: '#FFF' });
        this.highScoreText = this.add.text(200, 16, 'High Score: ' + this.highScore, { fontSize: '25px', fill: '#FFF' });
        // Display brokenBonez out of 5.
        this.brokenBonesText = this.add.text(this.game.config.width - 270, 16, 'Broken Bonez: ' + this.brokenBones + '/5', { fontSize: '25px', fill: '#FFF' });
        this.spinCooldownText = this.add.text(12, 50, 'Spin ready', { fontSize: '20px', fill: '#FFF' });
        this.jumpCooldownText = this.add.text(320, 50, 'Jump ready', { fontSize: '20px', fill: '#FFF' });
        // Display power-up inventory counter out of 1.
        this.powerUpCountText = this.add.text(600, 50, 'Power-ups: ' + this.powerUpCount + '/1', { fontSize: '20px', fill: '#FFF' });
        
        // Set Matter world bounds.
        this.matter.world.setBounds(0, 0, this.game.config.width, this.game.config.height);
        
        // Create the bike.
        this.bike = this.matter.add.sprite(100, this.game.config.height - 100, 'bike', null, { ignoreGravity: false });
        this.bike.setScale(0.5);
        let bikeWidth = this.bike.displayWidth * 0.8;
        let bikeHeight = this.bike.displayHeight * 0.8;
        const { Bodies, Body } = Phaser.Physics.Matter.Matter;
        let mainBody = Bodies.rectangle(this.bike.x, this.bike.y, bikeWidth, bikeHeight, { label: 'mainBody' });
        let topSensor = Bodies.rectangle(this.bike.x, this.bike.y - bikeHeight / 2, bikeWidth / 1.5, 10, { isSensor: true, label: 'topSensor' });
        let compoundBody = Body.create({ parts: [mainBody, topSensor], friction: 0.005, frictionAir: 0.005 });
        this.bike.setExistingBody(compoundBody);
        this.bike.setOrigin(0.5, 0.5);
        this.bike.mainBody = mainBody;
        this.bike.topSensor = topSensor;
        
        // Collision callback for jump detection.
        this.bike.setOnCollideActive((collisionData) => {
            if (collisionData.bodyA.label !== 'topSensor' && collisionData.bodyB.label !== 'topSensor') {
                this.canJump = true;
            }
        });
        
        // Broken Bonez detection.
        this.matter.world.on('collisionstart', (event) => {
            let now = Date.now();
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                if ((bodyA.label === 'topSensor' || bodyB.label === 'topSensor') && (now - this.lastBrokenBoneTime > 500)) {
                    this.brokenBones++;
                    this.brokenBonesText.setText('Broken Bonez: ' + this.brokenBones + '/5');
                    this.lastBrokenBoneTime = now;
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
        this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        
        // Create audio.
        this.motorcycleRevSound = this.sound.add('motorcyclerev', { loop: true });
        this.motorcycleBgmSound = this.sound.add('motorcyclebgm', { loop: true });
        this.dingSound = this.sound.add('ding');
        this.motorcycleBgmSound.play();
        
        // Create ramps.
        this.ramps = [];
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnRamp,
            callbackScope: this,
            loop: true
        });
        
        // --- QTE Setup for Power-up Acquisition ---
        this.input.keyboard.on('keydown', this.handleQTEInput, this);
        // Schedule a QTE every 10-15 seconds.
        this.time.addEvent({
            delay: Phaser.Math.Between(10000, 15000),
            callback: () => {
                // Play the "Ding" sound 1 second before starting the QTE.
                this.dingSound.play();
                this.time.addEvent({
                    delay: 1000,
                    callback: this.startQTE,
                    callbackScope: this
                });
            },
            callbackScope: this,
            loop: true
        });
    }
    
    updateScore(points) {
        if (this.powerUpActive) { points *= 2; }
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
        let ramp = this.matter.add.sprite(x, y, 'ramp', null, { ignoreGravity: true });
        ramp.setDisplaySize(150, 50);
        ramp.setOrigin(0, 1);
        const vertices = [
            { x: 0, y: 0 },
            { x: 150, y: 0 },
            { x: 150, y: -50 }
        ];
        const { Bodies } = Phaser.Physics.Matter.Matter;
        let body = Bodies.fromVertices(x, y, vertices, { isStatic: true }, true);
        ramp.setExistingBody(body);
        this.ramps.push(ramp);
    }
    
    // --- QTE Methods (Chained QTE for Power-up Acquisition) ---
    startQTE() {
        if (this.gameOverFlag || this.qteActive) return;
        const pool = ['W', 'A', 'S', 'D', 'SPACE', 'E'];
        this.qteSequence = [];
        for (let i = 0; i < 5; i++) {
            this.qteSequence.push(Phaser.Utils.Array.GetRandom(pool));
        }
        this.qteIndex = 0;
        this.qteActive = true;
        // Create two text objects: one for the full sequence (white) and one for the instruction (red).
        this.qteSequenceText = this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 30, 
            'QTE: ' + this.qteSequence.join(' '),
            { fontSize: '40px', fill: '#FFFFFF', align: 'center' }).setOrigin(0.5);
        this.qteInstructionText = this.add.text(this.game.config.width / 2, this.game.config.height / 2 + 30, 
            'Press: ' + this.qteSequence[0],
            { fontSize: '40px', fill: '#FF0000', align: 'center' }).setOrigin(0.5);
        // QTE sequence lasts 10 seconds.
        this.qteTimerEvent = this.time.addEvent({
            delay: 10000,
            callback: this.failQTE,
            callbackScope: this
        });
    }
    
    handleQTEInput(event) {
        if (!this.qteActive) return;
        let pressedKey = (event.key === " " ? "SPACE" : event.key.toUpperCase());
        if (!['W', 'A', 'S', 'D', 'SPACE', 'E'].includes(pressedKey)) return;
        if (pressedKey === this.qteSequence[this.qteIndex]) {
            this.qteIndex++;
            if (this.qteIndex >= this.qteSequence.length) {
                this.completeQTE();
            } else {
                this.qteInstructionText.setText('Press: ' + this.qteSequence[this.qteIndex]);
            }
        } else {
            this.failQTE();
        }
    }
    
    completeQTE() {
        // Award a power-up if none is held.
        if (this.powerUpCount < 1) {
            this.powerUpCount = 1;
            this.powerUpCountText.setText('Power-ups: ' + this.powerUpCount + '/1');
        }
        if (this.qteSequenceText) { this.qteSequenceText.destroy(); this.qteSequenceText = null; }
        if (this.qteInstructionText) { this.qteInstructionText.destroy(); this.qteInstructionText = null; }
        if (this.qteTimerEvent) { this.qteTimerEvent.remove(false); this.qteTimerEvent = null; }
        this.qteActive = false;
    }
    
    failQTE() {
        // Penalty: add 1 broken bone.
        this.brokenBones++;
        this.brokenBonesText.setText('Broken Bonez: ' + this.brokenBones + '/5');
        if (this.qteSequenceText) { this.qteSequenceText.destroy(); this.qteSequenceText = null; }
        if (this.qteInstructionText) { this.qteInstructionText.destroy(); this.qteInstructionText = null; }
        if (this.qteTimerEvent) { this.qteTimerEvent.remove(false); this.qteTimerEvent = null; }
        this.qteActive = false;
    }
    
    // --- Power-up Activation ---
    activatePowerUp() {
        this.powerUpActive = true;
        this.bike.setTint(0xff0000);
        // Use the held power-up, so reset the inventory.
        this.powerUpCount = 0;
        this.powerUpCountText.setText('Power-ups: ' + this.powerUpCount + '/1');
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
        if (this.gameOverFlag) { return; }
        
        this.background.tilePositionX += 2;
        
        for (let i = this.ramps.length - 1; i >= 0; i--) {
            let ramp = this.ramps[i];
            ramp.setPosition(ramp.x - 2, ramp.y);
            if (ramp.x + ramp.displayWidth < 0) {
                ramp.destroy();
                this.ramps.splice(i, 1);
            }
        }
        
        const groundTolerance = 5;
        if (this.bike.body.bounds.max.y >= this.game.config.height - groundTolerance &&
            Math.abs(this.bike.body.velocity.y) < 1) {
            this.canJump = true;
        }
        
        // --- JUMP LOGIC (Unlimited jumps during power-up) ---
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && (this.powerUpActive || (this.canJump && this.canJumpAgain))) {
            this.bike.setVelocityY(-10);
            if (!this.powerUpActive) {
                this.canJump = false;
                this.canJumpAgain = false;
                this.lastJumpTime = time;
                this.time.addEvent({
                    delay: this.jumpCooldownDuration,
                    callback: () => { this.canJumpAgain = true; },
                    callbackScope: this
                });
            }
        }
        if (this.powerUpActive) {
            this.jumpCooldownText.setText('Jump ready');
        } else if (!this.canJumpAgain) {
            let remainingJump = Math.max(0, (this.jumpCooldownDuration - (time - this.lastJumpTime)) / 1000);
            this.jumpCooldownText.setText('Jump cooldown: ' + remainingJump.toFixed(1) + 's');
        } else {
            this.jumpCooldownText.setText('Jump ready');
        }
        
        // --- Forward/Backward Thrust ---
        if (Phaser.Input.Keyboard.JustDown(this.wKey)) {
            let forceX = this.powerUpActive ? 0.04 : 0.02;
            this.bike.applyForce({ x: forceX, y: 0 });
        } else if (this.wKey.isDown) {
            let forceX = this.powerUpActive ? 0.004 : 0.002;
            this.bike.applyForce({ x: forceX, y: 0 });
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.sKey)) {
            this.bike.applyForce({ x: -0.02, y: 0 });
        } else if (this.sKey.isDown) {
            this.bike.applyForce({ x: -0.002, y: 0 });
        }
        
        // --- Rotation and Auto-correction ---
        if (!this.doing360) {
            if (this.aKey.isDown) {
                this.bike.setAngularVelocity(-0.05);
            } else if (this.dKey.isDown) {
                this.bike.setAngularVelocity(0.05);
            } else {
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
        
        // --- 360 Spin (Flip) Logic (Unlimited during power-up) ---
        if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.canSpin && !this.doing360) {
            this.doing360 = true;
            this.spinCumulativeRotation = 0;
            this.lastBikeRotation = this.bike.rotation;
            this.bike.setAngularVelocity(0.25);
            this.lastSpinTime = time;
            if (!this.powerUpActive) {
                this.canSpin = false;
                this.time.addEvent({
                    delay: this.spinCooldownDuration,
                    callback: () => { this.canSpin = true; },
                    callbackScope: this
                });
            }
            if (!this.motorcycleRevSound.isPlaying) {
                this.motorcycleRevSound.play();
            }
            if (this.motorcycleBgmSound.isPlaying) {
                this.motorcycleBgmSound.stop();
            }
        }
        if (this.doing360) {
            let currentRotation = this.bike.rotation;
            let deltaRotation = Phaser.Math.Angle.Wrap(currentRotation - this.lastBikeRotation);
            this.spinCumulativeRotation += Math.abs(deltaRotation);
            this.lastBikeRotation = currentRotation;
            if (this.spinCumulativeRotation >= Math.PI * 2) {
                this.bike.setAngularVelocity(0);
                this.doing360 = false;
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
        
        if (!this.canSpin) {
            let remaining = Math.max(0, (this.spinCooldownDuration - (time - this.lastSpinTime)) / 1000);
            this.spinCooldownText.setText('Spin cooldown: ' + remaining.toFixed(1) + 's');
        } else {
            this.spinCooldownText.setText('Spin ready');
        }
        
        // --- Wheelie Scoring ---
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
        
        // --- Power-up Activation (Using F) ---
        if (Phaser.Input.Keyboard.JustDown(this.fKey) && this.powerUpCount > 0 && !this.powerUpActive) {
            this.activatePowerUp();
            this.powerUpCount = 0;
            this.powerUpCountText.setText('Power-ups: ' + this.powerUpCount + '/1');
        }
        
        // Update power-up inventory counter display.
        this.powerUpCountText.setText('Power-ups: ' + this.powerUpCount + '/1');
        
        // --- Loss Mechanism ---
        if (this.brokenBones >= 5 && !this.gameOverFlag) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.gameOverFlag = true;
        this.sound.stopAll();
        let overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7).setOrigin(0, 0);
        this.add.text(this.game.config.width / 2, this.game.config.height / 2 - 50, 'GAME OVER', { fontSize: '50px', fill: '#FF0000' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, this.game.config.height / 2 + 50, 'Press M for Main Menu or N to Restart', { fontSize: '30px', fill: '#FFF' }).setOrigin(0.5);
        
        this.input.keyboard.once('keydown-M', () => {
            this.scene.start('menuScene');
        });
        this.input.keyboard.once('keydown-N', () => {
            this.scene.restart();
        });
    }
}
