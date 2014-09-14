// ##########################################
// GLOBALS
// ##########################################

var MAX_BULLETS = 20;
var MAX_COOLDOWN_STEP = 0.1;

var PLAYER_SPEED = 5;
var PLAYER_HIT_HEALTH_LOSS = 25; // when player gets hit, lose this amount

var MAX_BALL_BULLETS = 6;
var BALL_DISTANCE_FROM_PLAYER = 100;
var BALL_INITIAL_COOLDOWN = 0; // when player pulls ball, cooldown so cant reshoot
var BALL_MAX_COOLDOWN = 50; // when player pulls ball, cooldown so cant reshoot
var BALL_COOLDOWN_STEP = 1;

var ENEMY_MAX_SPEED = 3;
var ENEMY_SPAWN_RATE_STEP = 1; // %
var ENEMY_SPAWN_RATE_CAP = 5; // %

var WEAPONS = {
	'doubleShot': {
		'title': 'doubleShot',
		'xMove': 12,
		'yMove': 0,
		'cooldown': 0.8,
		'filename': 'img/small_laser.png',
	},
	'tripleShot': {
		'title': 'tripleShot',
		'xMove': 20,
		'yMove': 0,
		'cooldown': 1.2,
		'ballXMove': 20,
		'ballYMove': 2,
		'ballCooldown': 1,
		'filename': 'img/small_laser.png',
	},
	'quadShot': {
		'title': 'quadShot',
		'xMove': 25,
		'yMove': 0,
		'cooldown': 1.5,
		'filename': 'img/small_laser.png',
	},
}

var SPECIAL_WEAPONS = {
	'shock': {
		'xMove': 15,
		'yMove': 4,
		'cooldown': 1.1,
		'filename': 'img/shock.png',
		'animated': true,
	},
}

// ##########################################
// Functions
// ##########################################
function isCollide(a, b) {
	return !(
		((a.y + a.height) < (b.y)) ||
		(a.y > (b.y + b.height)) ||
		((a.x + a.width) < b.x) ||
		(a.x > (b.x + b.width))
	);
}

// ##########################################
// STAGE
// ##########################################
// create an new instance of a pixi stage
var stage = new PIXI.Stage(0xF1F1F1);
var stageHeight = 720 * 0.75;
var stageWidth = (16/9) * stageHeight;
// renderer
var renderer = new PIXI.autoDetectRenderer(stageWidth, stageHeight); 
// set the canvas width and height to fill the screen
renderer.view.style.width = stageWidth + "px";
renderer.view.style.height = stageHeight + "px";
renderer.view.style.display = "block";
// add render view to DOM
$('#game').append(renderer.view);
requestAnimFrame(animate);

// ##########################################
// STAGE VARS
// ##########################################		

var frameCount = 0;
var currentStage;

var hud;
var player;
var playerHealth = 100;
var ballShot = false;
var ballCooldown = BALL_INITIAL_COOLDOWN;
var ballAttached = true;
var ballBullets = [];
var ball;
var ballX;
var ballFinalX = 0;
var bullets = [];
var cooldown = 0;
var currentWeapon;
var weaponUpgradeSpawn = true;
var weaponUpgrades = [];
var loadedWeapons = [];
var canShoot = true;

var enemies = [];
var enemySpawnRate = 5; // %
var enemySpawnRateIncreaseAfter = 100; // after frames // 1000
var enemySpawn = true;
var enemyPositionCounter = 1;
var explosions = [];

var scoreBoard;

// ##########################################
// Textures
// ##########################################
var enemyTexture1 = new PIXI.Texture.fromImage("img/alien.png");
var enemyTexture2 = new PIXI.Texture.fromImage("img/alien2.png");
var bulletTexture = new PIXI.Texture.fromImage("img/small_laser.png");
var bulletTexture2 = new PIXI.Texture.fromImage("img/shock.png");
var weaponUpgradeTexture = new PIXI.Texture.fromImage("img/upgrade.png");

// ##########################################
// Scoreboard
// ##########################################
function ScoreBoard() {
	var style = {
		fill: '#ffffff',
		font: 'lighter 18px Arial',
	};
	
	this.score = 0;
	this.scoreObject = new PIXI.Text("Score: 0");
	this.scoreObject.position.x = 15;
	this.scoreObject.position.y = 10;
	this.scoreObject.setStyle(style);
	stage1.addChild(this.scoreObject);
	
	this.killed = 0;
	this.scoreObject = new PIXI.Text("Killed: 0");
	this.scoreObject.position.x = 15;
	this.scoreObject.position.y = 30;
	this.scoreObject.setStyle(style);
	stage1.addChild(this.scoreObject);
	
	this.invaded = 0;
	this.invadedObject = new PIXI.Text("Invaded: 0");
	this.invadedObject.position.x = 15;
	this.invadedObject.position.y = 50;
	this.invadedObject.setStyle(style);
	stage1.addChild(this.invadedObject);
}

// ##########################################
// STAGES
// ##########################################			
var stage1 = new PIXI.DisplayObjectContainer();
var bg = PIXI.Texture.fromImage("img/bg_tile.png");
var tilingBg = new PIXI.TilingSprite(bg, window.innerWidth, window.innerHeight);
stage1.addChild(tilingBg);
stage.addChild(stage1);
currentStage = stage1;

function end() {
	var style = {
		fill: '#ffffff',
		align: 'center',
		font: 'bold 40px Arial',
	};
	text = new PIXI.Text(
		"Your ship blew up!\n\n" +
		"Your managed to kill " + 
		scoreBoard.score + 
		" aliens." +
		"\n\n" +
		"No one can save the earth now..."
	);
	text.anchor = new PIXI.Point(0.5, 0.5);
	text.position.x = stageWidth / 2;
	text.position.y = stageHeight / 2;
	text.setStyle(style);
	currentStage.addChild(text);
}
// ##########################################
// OBJECTS
// ##########################################	
function PlayerBall(playerCurrentPositionX, playerCurrentPositionY) {
	this.xMove = 5;
	this.startPositionX = playerCurrentPositionX;
	this.startPositionY = playerCurrentPositionY;
	this.beforeShotX = 0; // before the ball was shot position
	this.beforeShotY = 0; // will be set when the ball is shot

	this.object = new PIXI.Sprite(PIXI.Texture.fromImage("img/ball.png"));
	this.object.height = 25;
	this.object.width = 25;
	this.object.position.x = playerCurrentPositionX + player.width + this.object.width / 2;
	this.object.position.y = playerCurrentPositionY + player.height / 2;
	this.object.anchor = new PIXI.Point(0.5, 0.5);
	stage1.addChild(this.object);
}

function Enemy() {
	this.objectTypes = []
	this.movementTypes = ['sin', 'cos', 'straight']
	
	this.health = 1;
	currentEnemyTexture = enemyTexture1;
	
	if (Math.round(Math.random() * 100) >= 50) {
		this.health = 1;
		currentEnemyTexture = enemyTexture1;
	}
	else {
		this.health = 2;
		currentEnemyTexture = enemyTexture2;
	}
	
	this.movementType = this.movementTypes[Math.round(Math.random() * this.movementTypes.length)]; // occasionally causes undefined
	this.startingPositionY = 0;
	this.startingPositionHit = 0;
	this.cycle = 0;
	this.amplitude = Math.round(Math.random() * 5);
	this.speed = Math.round(Math.random() * ENEMY_MAX_SPEED);
	if (this.speed > ENEMY_MAX_SPEED) {
		this.speed = ENEMY_MAX_SPEED;
	}
	this.object = new PIXI.DisplayObjectContainer();
				
	this.startingPositionY = Math.random() * 1000; // set random starting position 
	if (this.startingPositionY > stageHeight) {
		this.startingPositionY -= stageHeight;
	}
	if (this.startingPositionY < 100) {
		this.startingPositionY += 100;
	}
	if (this.startingPositionY > (stageHeight - 100)) {
		this.startingPositionY -= 100;
	}
	
	sprite = new PIXI.Sprite(currentEnemyTexture);
		
	sprite.height = 30;
	sprite.width = 30;
	this.object.addChild(sprite);
	this.object.anchor = new PIXI.Point(0.5, 0.5);
	this.object.position.x = stageWidth + 50; // make just our of screen width
	this.object.position.y = this.startingPositionY; // set our starting position to value from vairable
	this.object.height = 30;
	this.object.width = 30;
	
	stage1.addChild(this.object);
	
}

function Bullet(xStart, yStart, xMove, yMove, rotation, special, params) {
	this.params = (typeof params === "undefined") ? "0" : params;
	this.xMove = xMove;
	this.yMove = yMove;
	this.rotation = (typeof rotation === "undefined") ? "5" : rotation;

	this.bullet = new PIXI.Sprite(bulletTexture);
	this.bullet.anchor = new PIXI.Point(0.5, 0.5);
	this.bullet.position.x = xStart;
	this.bullet.position.y = yStart;
	this.bullet.height = 10;
	this.bullet.width = 20;

	stage1.addChild(this.bullet);

}

function HUD() {
	this.object = new PIXI.DisplayObjectContainer();
	this.object.anchor = new PIXI.Point(0.5, 0.5);
	this.object.position.x = 15;
	this.object.position.y = 100;
	this.object.height = 100;
	this.object.width = 20;
	
	playerBar = new PIXI.Sprite(PIXI.Texture.fromImage("img/health/Glass2.png"));
	playerBar.height = 100;
	playerBar.width = 20;
	this.object.addChild(playerBar);
	
	this.playerHealthBar = new PIXI.Sprite(PIXI.Texture.fromImage("img/health/Health2.png"));
	this.playerHealthBar.anchor = new PIXI.Point(0, 1);
	this.playerHealthBar.position.x = 2;
	this.playerHealthBar.position.y = this.object.position.y;
	this.playerHealthBar.height = playerHealth;
	this.playerHealthBar.width = 16;
	this.object.addChild(this.playerHealthBar);
	
	stage1.addChild(this.object);
}

function WeaponUpgrade() {
	this.object = new PIXI.DisplayObjectContainer();
	
	this.speed = 5;
	this.startingPositionY = Math.random() * 1000; // set random starting position 
	if (this.startingPositionY > stageHeight) {
		this.startingPositionY -= stageHeight;
	}
	if (this.startingPositionY < 100) {
		this.startingPositionY += 100;
	}
	if (this.startingPositionY > (stageHeight - 100)) {
		this.startingPositionY -= 100;
	}
	
	sprite = new PIXI.Sprite(weaponUpgradeTexture);
	sprite.height = 25;
	sprite.width = 25;
	this.object.addChild(sprite);
	
	this.object.anchor = new PIXI.Point(0.5, 0.5);
	this.object.position.x = stageWidth + 100;
	this.object.position.y = this.startingPositionY;
	this.object.height = 25;
	this.object.width = 25;
	this.object.pivot = new PIXI.Point(12.5, 12.5);
	
	stage1.addChild(this.object);
}

function Player() {
	currentWeapon = WEAPONS.tripleShot;
	hud = new HUD();

	var playerContainer = new PIXI.DisplayObjectContainer();
		playerContainer.anchor = new PIXI.Point(0.5, 0.5);
		playerContainer.height = 50;
		playerContainer.width = 50;
		playerContainer.position.x = 300;
		playerContainer.position.y = stageHeight / 2;
	
	// plane
	var plane;
	var random = Math.round(Math.random() * 10);
	if (random <= 3) {
		plane = new PIXI.Sprite(PIXI.Texture.fromImage("img/spaceship.png"));
		plane.height = 50;
		plane.width = 50;
	}
	else if (random <= 6) {
		plane = new PIXI.Sprite(PIXI.Texture.fromImage("img/spaceship2.png"));
		plane.height = 50;
		plane.width = 50;
	}
	else {
		plane = new PIXI.Sprite(PIXI.Texture.fromImage("img/spaceship3.png"));
		plane.height = 50;
		plane.width = 50;
	}
	playerContainer.addChild(plane);
	stage1.addChild(playerContainer);
	return playerContainer;
}

function PlayerController(player) {
	
	ball = new PlayerBall(player.position.x, player.position.y);
	var ballStartPosition = ball.object.position.x;
	var speed = PLAYER_SPEED;
	
	
	kd.W.down(function() {
		if (player.y > 0) {
			player.y -= speed;
			if (ballShot == false) {
				ball.object.position.y -= speed;
			}
		}
	});
	kd.S.down(function() {
		if (player.y + player.height < stageHeight) {
			player.y += speed;
			if (ballShot == false) {
				ball.object.position.y += speed;
			}
		}
	});
	kd.A.down(function() {
		if (player.x > 0) {
			player.x -= speed;
			if (ballShot == false) {
				ball.object.position.x -= speed;
			}
		}
	});
	kd.D.down(function() {
		if (player.x + player.width < stageWidth) {
			player.x += speed;
			if (ballShot == false) {
				ball.object.position.x += speed;
			}
		}
	});
	kd.E.down(function() {
		
		if (ballCooldown <= 0) {
			if (ballShot == false) {
				ballShot = true;
				ballCooldown = BALL_MAX_COOLDOWN;
				ball.beforeShotX = ball.object.position.x;
				ball.beforeShotY = ball.object.position.y;
			}
			else {
				ballShot = false;
				ballCooldown = BALL_MAX_COOLDOWN;
				ball.object.position.x = player.position.x + player.width + ball.object.width / 2;
				ball.object.position.y =  player.position.y + player.height / 2;
			}
		}
	});
	kd.B.down(function() {
		player.x += speed * 2;
		ball.x += speed * 2;
	});
	
}

function PlayerScript() {
	// player objects
	player = new Player();
	

	// player controller
	var playerController = new PlayerController(player);
}

function ExplosionTextures() {
	// {x: 0, y: size, width: size, height: size}
	var frames = 12;
	var size = 134;
	var explosionTextures = [];
	var explosionTexture = new PIXI.Texture.fromImage("img/explosion.png").baseTexture;
	explosionTexture.height = 50;
	explosionTexture.width = 50;
	explosionTexture.anchor = (0.5, 0.5);
	
	// get frame from sprite sheet
	for (i = 0; i < size * frames; i += size) {
		var frame = new PIXI.Texture(explosionTexture, {x: i, y: 0, width: 134, height: 134 });
		explosionTextures.push(frame);
	}
	
	return explosionTextures;
}

var explodeTextures = new ExplosionTextures();

function AnimateExplosion(x, y) {

	var animation = new PIXI.MovieClip(explodeTextures);
	animation.position.x = x;
	animation.position.y = y;
	animation.anchor.x = 0.5;
	animation.anchor.y = 0.5;
	animation.loop = false;
	
	// lets randomize the explosion speed and size
	// but not go crazy
	random = Math.random();
	if (random < 0.35) {
		animation.animationSpeed = 0.35;
		animation.scale = {x:0.75, y:0.75};;
	}
	else {
		animation.animationSpeed = random;
		animation.scale = {x:1, y:1};;
	}

	stage1.addChild(animation);
	
	animation.play();
	animation.onComplete = function() {
		// bug, work around to remove because cannot call stage1.removeChild(this);
		setTimeout(function(t) {
			stage1.removeChild(t);
		}, 15, this);
	};
	
	return animation;
}

function init() {
	explosion = new AnimateExplosion();

	// load our player
	new PlayerScript();
	scoreBoard = new ScoreBoard();	
}

init();

function animate() {
	
	kd.tick(); // activate our keydowns
	randomNumber = Math.random();
	
	if (cooldown == 0 && canShoot == true) {
		cooldown = currentWeapon.cooldown;

		switch (currentWeapon.title) {
			case 'doubleShot':
				if (ballShot == true) {
					bullet = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2),
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullets.push(bullet);
					ballBullet = new Bullet(
						ball.object.position.x + ball.object.width / 2,
						ball.object.position.y - 10,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					ballBullet2 = new Bullet(
						ball.object.position.x + ball.object.width / 2,
						ball.object.position.y + 10,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					ballBullets.push(ballBullet);
					ballBullets.push(ballBullet2);
				}
				else {
					bullet = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2) - 10,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullet2 = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2) + 10,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullets.push(bullet);
					bullets.push(bullet2);
				}
				break;
			case 'tripleShot':
				if (ballShot == true) {
					bullet = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2),
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullets.push(bullet);
					ballBullet = new Bullet(
						ball.object.position.x + ball.object.width / 2,
						ball.object.position.y,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					ballBullet2 = new Bullet(
						ball.object.position.x + ball.object.width / 2,
						ball.object.position.y,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					ballBullets.push(ballBullet);
					ballBullets.push(ballBullet2);
				}
				else {
					bullet = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2) - 15,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullet2 = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2),
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullet3 = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2) + 15,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullets.push(bullet);
					bullets.push(bullet2);
					bullets.push(bullet3);
				}
				break;
			case 'quadShot':
				if (ballShot == true) {
					bullet = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2),
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullets.push(bullet);
					ballBullet = new Bullet(
						ball.object.position.x + ball.object.width / 2,
						ball.object.position.y,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					ballBullets.push(ballBullet);
				}
				else {
					bullet = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2) - 15,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullet2 = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2) - 5,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullet3 = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2) + 5,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullet4 = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2) + 15,
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullets.push(bullet);
					bullets.push(bullet2);
					bullets.push(bullet3);
					bullets.push(bullet4);
				}
				break;	
			
		}
	}
	
	// spawn enemies
	if (enemySpawn) {
		if (Math.round(randomNumber * 100) < enemySpawnRate) {
			var enemy = new Enemy();
			enemies.push(enemy);
			
			// increase difficulty overtime
			if (frameCount > enemySpawnRateIncreaseAfter) {
				if (enemySpawnRate <= ENEMY_SPAWN_RATE_CAP) {
					enemySpawnRate += ENEMY_SPAWN_RATE_STEP;
					enemySpawnRateIncreaseAfter += enemySpawnRateIncreaseAfter;
				}
			}
		}
	}
	
	// spawn upgrade
	if (weaponUpgradeSpawn) {
		if (frameCount % 1000 == 0) {
			var weaponUpgrade = new WeaponUpgrade();
			weaponUpgrades.push(weaponUpgrade);
		}
	}
	
	for (i = 0; i < weaponUpgrades.length; i++) {
		weaponUpgrades[i].object.position.x -= 1;
		weaponUpgrades[i].object.rotation += Math.PI / 64;
		
		var a;
		a = {
			'x': player.position.x,
			'y': player.position.y,
			'height': player.height,
			'width': player.width
		}
		var b = {
			'x': weaponUpgrades[i].object.position.x,
			'y': weaponUpgrades[i].object.position.y,
			'height': weaponUpgrades[i].object.height,
			'width': weaponUpgrades[i].object.width,
		}
		if (isCollide(a, b)) {
			stage1.removeChild(weaponUpgrades[i].object);
			weaponUpgrades.splice(i, 1);
			
			var random = Math.round(Math.random() * 10);
			if (random < 3) {
				currentWeapon = WEAPONS.tripleShot;
			}
			else if (random < 6 && random >= 3) {
				currentWeapon = WEAPONS.quadShot;
			}
			else {
				currentWeapon = WEAPONS.doubleShot;
			}			
			break;
		}
	}
	
	// enemy movement
	for (i = 0; i < enemies.length; i++) {
		
		if (enemies[i].movementType == 'sin') {
			moveInY = enemies[i].object.position.y + (Math.sin(Math.PI * enemies[i].cycle) * enemies[i].amplitude);
			// if greater than screen height
			if (moveInY + enemies[i].object.height >= stageHeight) {
				enemies[i].object.position.y = stageHeight - 50;
			}
			else if (moveInY <= 0) {
				enemies[i].object.position.y = 0;
			}
			else {
				enemies[i].object.position.y = enemies[i].object.position.y + (Math.cos(Math.PI * enemies[i].cycle) * enemies[i].amplitude);
			}
		}
		else if (enemies[i].movementType == 'straight') {
			enemies[i].object.position.y = enemies[i].startingPositionY;
		}
		else {
			moveInY = enemies[i].object.position.y + (Math.cos(Math.PI * enemies[i].cycle) * enemies[i].amplitude);
			// if greater than screen height
			if (moveInY + enemies[i].object.height >= stageHeight) {
				enemies[i].object.position.y = stageHeight - 50;
			}
			// if less than screen height
			else if (moveInY <= 0) {
				enemies[i].object.position.y = 0;
			}
			else {
				enemies[i].object.position.y = enemies[i].object.position.y + (Math.cos(Math.PI * enemies[i].cycle) * enemies[i].amplitude);
			}
		}
		
		enemies[i].object.position.x = enemies[i].object.position.x - enemies[i].speed; // enemy x position move left
		enemies[i].cycle = enemies[i].cycle + 0.01; // add a cycle for each specfic enemy object (for future usage of differnet moviments)
		
		
		// check for player hit enemy
		var a;
		if (ballShot == true) {
			a = {
				'x': player.position.x,
				'y': player.position.y,
				'height': player.height,
				'width': player.width
			}
		}
		else {
			a = {
				'x': player.position.x,
				'y': player.position.y,
				'height': player.height,
				'width': player.width + ball.object.width,
			}
		}
		var b = {
			'x': enemies[i].object.position.x,
			'y': enemies[i].object.position.y,
			'height': enemies[i].object.height,
			'width': enemies[i].object.width,
		}
		if (isCollide(a, b)) {
			var explodeX = enemies[i].object.position.x + enemies[i].object.width/2;
			var explodeY = enemies[i].object.position.y + enemies[i].object.height/2;
			
			// remove enemy 
			stage1.removeChild(enemies[i].object);
			enemies.splice(i, 1);

			explosion = new AnimateExplosion(explodeX, explodeY);
			explosion.play();
			
			playerHealth -= PLAYER_HIT_HEALTH_LOSS;
			
			if (playerHealth < 0) {
				enemySpawn = false;
				canShoot = false;
				var explodeX = player.position.x + player.width/2;
				var explodeY = player.position.y + player.height/2;
				player.visible = false;
				explosion = new AnimateExplosion(explodeX, explodeY);
				explosion.play();
				end();
				enemies = [];
			}
			else {
				hud.playerHealthBar.height = playerHealth;
			}
			
			break;
		}

		// stop and remove enemy
		if (enemies[i].object.position.x < -50) {
			scoreBoard.invaded++;
			var index = enemies.indexOf(enemies[i]);
			stage1.removeChild(enemies[i].object);
			enemies.splice(index, 1);
			continue;
		}
	}
	
	// check for bullet hit
	for (i = 0; i < bullets.length; i++) {
		// move our player bullets
		bullets[i].bullet.position.x += bullets[i].xMove;
		bullets[i].bullet.position.y += bullets[i].yMove;
		
		for (j = 0; j < enemies.length; j++) {
			// check for player hit
			var a = {
				'x': bullets[i].bullet.position.x,
				'y': bullets[i].bullet.position.y,
				'height': bullets[i].bullet.height,
				'width': bullets[i].bullet.width
			}
			var b = {
				'x': enemies[j].object.position.x,
				'y': enemies[j].object.position.y,
				'height': enemies[j].object.height,
				'width': enemies[j].object.width,
			}
			if (isCollide(a, b)) {
				
				enemies[j].health -= 1;
				
				if (enemies[j].health == 0) {
				
					var explodeX = enemies[j].object.position.x + enemies[j].object.width / 2;
					var explodeY = enemies[j].object.position.y + enemies[j].object.height / 2;
					
					// remove bullet and enemy hit
					stage1.removeChild(enemies[j].object);
					enemies.splice(j, 1);
					stage1.removeChild(bullets[i].bullet);
					bullets.splice(i, 1);

					explosion = new AnimateExplosion(explodeX, explodeY);
					explosion.play();
					
					scoreBoard.killed++;
					break;
				}
				else {
					stage1.removeChild(bullets[i].bullet);
					bullets.splice(i, 1);
					break;
				}
			}
		}
	}
	
			
	// move our ball ballBullets
	if (ballShot) {
		// check for player hit
		var a = {
			'x': player.position.x,
			'y': player.position.y,
			'height': player.height,
			'width': player.width
		}
		var b = {
			'x': ball.object.position.x,
			'y': ball.object.position.y,
			'height': ball.object.height,
			'width': ball.object.width,
		}
		if (isCollide(a, b)) {
			ballShot = false;
			ball.object.position.x = player.position.x + player.width + ball.object.width / 2;
			ball.object.position.y =  player.position.y + player.height / 2;
		}
	}
	
	if (ballBullets.length > 0) {
		for (i = 0; i < ballBullets.length; i++) {
			ballBullets[i].bullet.position.x += ballBullets[i].xMove;
			ballBullets[i].bullet.position.y += ballBullets[i].yMove;
			
			for (j = 0; j < enemies.length; j++) {
				// check for player hit
				var a = {
					'x': ballBullets[i].bullet.position.x,
					'y': ballBullets[i].bullet.position.y,
					'height': ballBullets[i].bullet.height,
					'width': ballBullets[i].bullet.width
				}
				var b = {
					'x': enemies[j].object.position.x,
					'y': enemies[j].object.position.y,
					'height': enemies[j].object.height,
					'width': enemies[j].object.width,
				}
				if (isCollide(a, b)) {
					var explodeX = enemies[j].object.position.x + enemies[j].object.width / 2;
					var explodeY = enemies[j].object.position.y + enemies[j].object.height / 2;
					
					// remove bullet and enemy hit
					stage1.removeChild(enemies[j].object);
					enemies.splice(j, 1);
					stage1.removeChild(ballBullets[i].bullet);
					ballBullets.splice(i, 1);

					explosion = new AnimateExplosion(explodeX, explodeY);
					explosion.play();
					
					scoreBoard.score++;
					break;
				}
			}
		}
	}

	// shooting cooldown to prevent too many bullets
	if (cooldown <= 0) {cooldown = 0;} else {cooldown -= MAX_COOLDOWN_STEP;}
	
	// if bullet max, remove
	// also prevents offscreen bullets
	if (bullets.length > MAX_BULLETS) {
		stage1.removeChild(bullets[0].bullet);
		bullets.splice(0, 1);
	}
	if (ballBullets.length > MAX_BALL_BULLETS) {
		stage1.removeChild(ballBullets[0].bullet);
		ballBullets.splice(0, 1);
	}
	
	// move our ball
	if (ballShot == true) {
		if (ball.object.position.x > ball.beforeShotX + BALL_DISTANCE_FROM_PLAYER) {}
		else {
			ball.object.position.x += ball.xMove;
		}
	}
	
	// our cooldown ball to prevent keydown spam
	if (ballCooldown > 0) {
		ballCooldown -= BALL_COOLDOWN_STEP;
	}

	// set scoreboard as we score
	scoreBoard.scoreObject.setText("Killed: " + scoreBoard.killed);
	scoreBoard.invadedObject.setText("Invaded: " + scoreBoard.invaded);
	
	// render the stage
	frameCount++;
	renderer.render(stage);
	requestAnimFrame(animate);	    
}