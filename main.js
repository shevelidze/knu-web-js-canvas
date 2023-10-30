const SPEED = 300;
const ACCELERATION = 2;
const GAP_SIZE = 200;
const PIPE_WIDTH = 50;
const MIN_PIPE_GAP_BOTTOM_Y = 200;
const MAX_PIPE_GAP_BOTTOM_Y = 500;
const GAP_BETWEEN_PIPES = 300;
const BIRD_RADIUS = 30;
const GRAVITY_ACCELERATION = 2000;
const SWING_VELOCITY = 600;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Clock {
  constructor(framesPerSecond) {
    this.framesPerSecond = framesPerSecond;
    this.lastTickTime = new Date().getTime();
  }

  async tick() {
    const nowTime = new Date().getTime();

    const timeSinceLastTick = nowTime - this.lastTickTime;
    const timeToSleep = 1000 / this.framesPerSecond - timeSinceLastTick;

    if (timeToSleep > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeToSleep));
    }

    this.lastTickTime = new Date().getTime();
  }
}

class Pipe {
  constructor(gapBottomY, spawnTime, gameSpeed) {
    this.gapBottomY = gapBottomY;
    this.spawnTime = spawnTime;
    this.isPassed = false;
    this.passedDistance = 0;
    this.speed = gameSpeed.speed;
    this.gameSpeed = gameSpeed;

    this.speedChangeListener = (newSpeed) => {
      this.passedDistance = this.calculatedPassedDistance();
      this.speed = newSpeed;
      this.spawnTime = new Date().getTime();
    };

    this.gameSpeed.addListener(this.speedChangeListener);
  }

  calculatedPassedDistance() {
    return (
      this.passedDistance +
      (this.speed * (new Date().getTime() - this.spawnTime)) / 1000
    );
  }

  static createPipeWithRandomGap(gameSpeed) {
    return new Pipe(
      getRandomInt(MIN_PIPE_GAP_BOTTOM_Y, MAX_PIPE_GAP_BOTTOM_Y),
      new Date().getTime(),
      gameSpeed
    );
  }

  unregister() {
    this.gameSpeed.removeListener(this.speedChangeListener);
  }
}

class Bird {
  constructor() {
    this.y = canvasElement.height / 2;
    this.lastSwingTime = new Date().getTime();
  }

  calculateY() {
    const timePassedSinceLastSwing = new Date().getTime() - this.lastSwingTime;

    return (
      this.y -
      SWING_VELOCITY * (timePassedSinceLastSwing / 1000) +
      0.5 * GRAVITY_ACCELERATION * (timePassedSinceLastSwing / 1000) ** 2
    );
  }

  swing() {
    this.y = this.calculateY();
    this.lastSwingTime = new Date().getTime();
  }
}

class GameSpeed {
  constructor() {
    this.speed = SPEED;
    this.listeners = [];
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  increase() {
    this.speed += ACCELERATION;

    for (const listener of this.listeners) {
      listener(this.speed);
    }
  }
}

const canvasElement = document.getElementById("canvas");
const canvasContext = canvasElement.getContext("2d");

function drawPipe(pipe) {
  const pipeX = canvasElement.width - pipe.calculatedPassedDistance();

  canvasContext.fillStyle = "green";
  canvasContext.fillRect(pipeX, 0, PIPE_WIDTH, pipe.gapBottomY - GAP_SIZE);
  canvasContext.fillRect(
    pipeX,
    pipe.gapBottomY,
    PIPE_WIDTH,
    canvasElement.height
  );
}

function clear() {
  canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

function getBirdX() {
  return canvasElement.width * 0.3;
}

function drawBird(bird) {
  canvasContext.beginPath();
  canvasContext.arc(getBirdX(), bird.calculateY(), BIRD_RADIUS, 0, 2 * Math.PI);
  canvasContext.fillStyle = "yellow";
  canvasContext.fill();
}

function drawScore(score) {
  canvasContext.fillStyle = "black";
  canvasContext.font = "50px monospace";
  canvasContext.fillText(`Score: ${score}`, 0, 50);
}

function isFail(bird, pipes) {
  if (bird.calculateY() < 0 || bird.calculateY() > canvasElement.height) {
    return true;
  }

  for (const pipe of pipes) {
    const pipeX = canvasElement.width - pipe.calculatedPassedDistance();

    if (
      getBirdX() + BIRD_RADIUS > pipeX &&
      getBirdX() - BIRD_RADIUS < pipeX + PIPE_WIDTH &&
      (bird.calculateY() - BIRD_RADIUS < pipe.gapBottomY - GAP_SIZE ||
        bird.calculateY() + BIRD_RADIUS > pipe.gapBottomY)
    ) {
      return true;
    }
  }

  return false;
}

async function runLoop() {
  const clock = new Clock(60);
  let gameSpeed = new GameSpeed();
  let score = 0;
  let spaceKeydownListener;

  function resetGame() {
    if (spaceKeydownListener) {
      document.removeEventListener("keydown", spaceKeydownListener);
    }

    gameSpeed = new GameSpeed();
    score = 0;
    pipes = [Pipe.createPipeWithRandomGap(gameSpeed)];
    bird = new Bird();
    spaceKeydownListener = (event) => {
      if (event.key === " ") {
        bird.swing();
      }
    };
    document.addEventListener("keydown", spaceKeydownListener);
  }

  let pipes;
  let bird;

  resetGame();

  while (true) {
    await clock.tick();
    clear();

    for (const pipe of pipes) {
      drawPipe(pipe);

      if (canvasElement.width - pipe.calculatedPassedDistance() < getBirdX()) {
        if (!pipe.isPassed) {
          score++;
          pipe.isPassed = true;
        }
      }
    }

    drawBird(bird);
    drawScore(score);

    if (
      pipes[pipes.length - 1].calculatedPassedDistance() > GAP_BETWEEN_PIPES
    ) {
      pipes.push(Pipe.createPipeWithRandomGap(gameSpeed));
    }

    if (
      pipes[0].calculatedPassedDistance() >
      canvasElement.width + PIPE_WIDTH
    ) {
      pipes.shift();
    }

    if (score > 0 && score % 10 === 0) {
      gameSpeed.increase();
    }

    if (isFail(bird, pipes)) {
      resetGame();
    }
  }
}

runLoop();
