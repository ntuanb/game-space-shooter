// ##########################################
// GLOBALS
// ##########################################

var MAX_BULLETS = 30;
var MAX_COOLDOWN_STEP = 0.1;

var PLAYER_SPEED = 5;
var PLAYER_HIT_HEALTH_LOSS = 10; // when player gets hit, lose this amount

var WEAPONS = {
	'single': {
		'title': 'single',
		'xMove': 10,
		'yMove': 0,
		'cooldown': 0.5
	},
	'double': {
		'title': 'double',
		'xMove': 12,
		'yMove': 4,
		'cooldown': 0.8
	},
	'triple': {
		'xMove': 15,
		'yMove': 4,
		'cooldown': 1.1
	},
}

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
var stageHeight = 768;
var stageWidth = (4/3) * stageHeight;
// renderer
var renderer = new PIXI.autoDetectRenderer(stageWidth, stageHeight); 
// set the canvas width and height to fill the screen
renderer.view.style.width = stageWidth + "px";
renderer.view.style.height = stageHeight + "px";
renderer.view.style.display = "block";
// add render view to DOM
$('.game').append(renderer.view);
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
var ball;
var ballX;
var ballFinalX = 0;
var bullets = [];
var cooldown = 0;
var currentWeapon;
var loadedWeapons = [];
var canShoot = true;

var enemies = [];
var enemySpawnRate = 0;
var enemySpawn = true;
var enemyPositionCounter = 1;
var explosions = [];

var scoreBoard;

// ##########################################
// Scoreboard
// ##########################################
function ScoreBoard() {
	var style = {
		fill: '#ffffff',
	};
	
	this.score = 0;
	this.scoreObject = new PIXI.Text("Score: 0");
	this.scoreObject.position.x = 15;
	this.scoreObject.position.y = 10;
	this.scoreObject.setStyle(style);
	stage1.addChild(this.scoreObject);
	
	this.invaded = 0;
	this.invadedObject = new PIXI.Text("Invaded: 0");
	this.invadedObject.position.x = 15;
	this.invadedObject.position.y = 40;
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
		" aliens but have died." +
		"\n\n" +
		"No one can save the earth now..."
	);
	text.anchor = new PIXI.Point(0.5, 0.5);
	text.position.x = stageWidth / 2;
	text.position.y = stageHeight / 2;
	text.setStyle(style);
	currentStage.addChild(text);
}

// our ball
function PlayerBall(x, y) {
	var playerBall = new PIXI.Sprite(PIXI.Texture.fromImage("img/ball.png"));
	playerBall.position.x = x + 100;
	playerBall.position.y = y;
	playerBall.height = 50;
	playerBall.width = 50;
	//stage1.addChild(playerBall);
	return playerBall;
}

function Enemy() {
	var movementTypes = ['sin', 'cos', 'straight']

	math = Math.round(Math.random() * movementTypes.length)
	this.movementType = movementTypes[math]; // occasionally causes undefined
	this.startingPositionY = 0;
	this.startingPositionHit = 0;
	this.cycle = 0;
	this.amplitude = Math.round(Math.random() * 5);
	this.speed = Math.round(Math.random() * 5);
	this.enemy = new PIXI.DisplayObjectContainer();
				
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
	
	sprite = new PIXI.Sprite(PIXI.Texture.fromImage("img/alien.png"));
	sprite.height = 50;
	sprite.width = 50;
	this.enemy.addChild(sprite);
	this.enemy.anchor = new PIXI.Point(0.5, 0.5);
	this.enemy.position.x = stageWidth + 50; // make just our of screen width
	this.enemy.position.y = this.startingPositionY; // set our starting position to value from vairable
	this.enemy.height = 50;
	this.enemy.width = 50;
	
	stage1.addChild(this.enemy);
	
}

function Bullet(xStart, yStart, xMove, yMove, rotation) {
	this.xMove = xMove;
	this.yMove = yMove;
	this.rotation = (typeof rotation === "undefined") ? "5" : rotation;

	this.bullet = new PIXI.Sprite(PIXI.Texture.fromImage("img/bullet.png"));
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

function Player() {
	currentWeapon = WEAPONS.single;
	hud = new HUD();

	var playerContainer = new PIXI.DisplayObjectContainer();
		playerContainer.anchor = new PIXI.Point(0.5, 0.5);
		playerContainer.height = 100;
		playerContainer.width = 100;
		playerContainer.position.x = 300;
		playerContainer.position.y = stageHeight / 2;
	
	// plane
	var plane;
	var random = Math.round(Math.random() * 10);
	if (random <= 3) {
		plane = new PIXI.Sprite(PIXI.Texture.fromImage("img/spaceship.png"));
		plane.height = 100;
		plane.width = 100;
	}
	else if (random <= 6) {
		plane = new PIXI.Sprite(PIXI.Texture.fromImage("img/spaceship2.png"));
		plane.height = 100;
		plane.width = 100;
	}
	else {
		plane = new PIXI.Sprite(PIXI.Texture.fromImage("img/spaceship3.png"));
		plane.height = 100;
		plane.width = 100;
	}
	playerContainer.addChild(plane);
	stage1.addChild(playerContainer);
	console.log(playerContainer.anchor);
	return playerContainer;
}

function PlayerController(player) {
	
	ball = new PlayerBall(player.position.x, player.position.y);
	var ballStartPosition = ball.position.x;
	var speed = PLAYER_SPEED;
	
	
	kd.W.down(function() {
		player.y -= speed;
		ball.y -= speed;
	});
	kd.S.down(function() {
		player.y += speed;
		ball.y += speed;
	});
	kd.A.down(function() {
		player.x -= speed;
		ball.x -= speed;
	});
	kd.D.down(function() {
		player.x += speed;
		ball.x += speed;
	});
	kd.V.down(function() {
		if (ballShot == false) {
			ballShot = true;
			ballX = ball.position.x;
		}
	});
	kd.E.down(function() { 
		if (cooldown == 0 && canShoot == true) {
			cooldown = currentWeapon.cooldown;

			
			switch (currentWeapon.title) {
				case 'single':
					bullet = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2),
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullets.push(bullet);
					break;
				case 'double':
					bullet1 = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2),
						currentWeapon.xMove,
						currentWeapon.yMove
					);
					bullet2 = new Bullet(
						player.position.x + player.width,
						player.position.y + (player.height / 2),
						currentWeapon.xMove,
						-currentWeapon.yMove
					);
					bullets.push(bullet1);
					bullets.push(bullet2);
					break;
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

	enemySpawnRate = Math.round(Math.random() * 50);

	if (enemySpawn) {
		if (frameCount % enemySpawnRate == 0) {
			var enemy = new Enemy();
			enemies.push(enemy);
		}
	}
	
	// enemy movemnt
	for (i = 0; i < enemies.length; i++) {
		
		if (enemies[i].movementType == 'sin') {
			enemies[i].enemy.position.y = enemies[i].enemy.position.y + (Math.sin(Math.PI * enemies[i].cycle) * enemies[i].amplitude); // enemy y position is Math.sin of cycle value
		
		}
		else if (enemies[i].movementType == 'straight') {
			enemies[i].enemy.position.y = enemies[i].startingPositionY;
		}
		else {
			enemies[i].enemy.position.y = enemies[i].enemy.position.y + (Math.cos(Math.PI * enemies[i].cycle)* enemies[i].amplitude);
		}
		
		enemies[i].enemy.position.x = enemies[i].enemy.position.x - enemies[i].speed; // enemy x position move left
		enemies[i].cycle = enemies[i].cycle + 0.01; // add a cycle for each specfic enemy object (for future usage of differnet moviments)
		
		
		// check for player hit enemy
		var a = {
			'x': player.position.x,
			'y': player.position.y,
			'height': player.height,
			'width': player.width
		}
		var b = {
			'x': enemies[i].enemy.position.x,
			'y': enemies[i].enemy.position.y,
			'height': enemies[i].enemy.height,
			'width': enemies[i].enemy.width,
		}
		if (isCollide(a, b)) {
			var explodeX = enemies[i].enemy.position.x + enemies[i].enemy.width/2;
			var explodeY = enemies[i].enemy.position.y + enemies[i].enemy.height/2;
			
			// remove enemy 
			stage1.removeChild(enemies[i].enemy);
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
			}
			else {
				hud.playerHealthBar.height = playerHealth;
			}
			
			break;
		}
		
		/* Enemy y begins to decay (because of cycle value).
		So we fix by reseting cycle value everytime 
		it a cycle is completed. */
		if (enemies[i].startPosition == enemies[i].enemy.position.x) {
			enemies[i].startingPositionHit++;
		}
		if (enemies[i].startingPositionHit >= 2) {
			enemies[i].startingPositionHit = 0;
			enemies[i].cycle = 0;
		}
		// stop and remove enemy
		if (enemies[i].enemy.position.x < -50) {
			scoreBoard.invaded++;
			var index = enemies.indexOf(enemies[i]);
			stage1.removeChild(enemies[i].enemy);
			enemies.splice(index, 1);
			continue;
		}
	}
	
	kd.tick(); // activate our keydowns

	// shooting cooldown to prevent too many bullets
	if (cooldown <= 0) {
		cooldown = 0;
	}
	else {
		cooldown -= MAX_COOLDOWN_STEP;
	}
	
	// check for bullet hit
	for (i = 0; i < bullets.length; i++) {
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
				'x': enemies[j].enemy.position.x,
				'y': enemies[j].enemy.position.y,
				'height': enemies[j].enemy.height,
				'width': enemies[j].enemy.width,
			}
			if (isCollide(a, b)) {
				var explodeX = enemies[j].enemy.position.x + enemies[j].enemy.width / 2;
				var explodeY = enemies[j].enemy.position.y + enemies[j].enemy.height / 2;
				
				// remove bullet and enemy hit
				stage1.removeChild(enemies[j].enemy);
				enemies.splice(j, 1);
				stage1.removeChild(bullets[i].bullet);
				bullets.splice(i, 1);

				explosion = new AnimateExplosion(explodeX, explodeY);
				explosion.play();
				
				scoreBoard.score++;
				break;
			}
		}
	}
	
	// check for bullet hit
	for (i = 0; i < bullets.length; i++) {
		bullets[i].bullet.position.x += bullets[i].xMove;
		bullets[i].bullet.position.y += bullets[i].yMove;
		for (j = 0; j < enemies.length; j++) {
			
			// hit bullet hits enemy in the x axis
			if (
				(bullets[i].bullet.position.x >= enemies[j].enemy.position.x) && 
				(bullets[i].bullet.position.x + bullets[i].bullet.height < enemies[j].enemy.position.x + enemies[j].enemy.height)
			) {
				// hit bullet hits enemy in the y axis
				if (
					((bullets[i].bullet.position.y > enemies[j].enemy.position.y) &&
					(bullets[i].bullet.position.y + bullets[i].bullet.width < enemies[j].enemy.position.y + enemies[j].enemy.width))
				) {
					// set x and y of enemy to explode
					var explodeX = enemies[j].enemy.position.x;
					var explodeY = enemies[j].enemy.position.y;
					
					// remove bullet and enemy hit
					stage1.removeChild(enemies[j].enemy);
					enemies.splice(j, 1);
					stage1.removeChild(bullets[i].bullet);
					bullets.splice(i, 1);

					explosion = new AnimateExplosion(explodeX, explodeY);
					explosion.play();
					
					scoreBoard.score++;
					break;
				}
			}
		}
	}
	
	// if bullet max, remove
	if (bullets.length > MAX_BULLETS) {
		stage1.removeChild(bullets[0].bullet);
		bullets.splice(0, 1);
	}

	// set scoreboard as we score
	scoreBoard.scoreObject.setText("Score: " + scoreBoard.score);
	scoreBoard.invadedObject.setText("Invaded: " + scoreBoard.invaded);
	
	// render the stage
	frameCount++;
	renderer.render(stage);
	requestAnimFrame(animate);	    
}