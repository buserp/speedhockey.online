import assertNever from 'assert-never';
import { Socket, io } from 'socket.io-client';
import { ARENA_HEIGHT, ARENA_WIDTH, PADDLE_RADIUS, PUCK_RADIUS, TICKRATE_MS } from './constants';
import { startPreciseInterval } from './shared';
import { ClientToServerEvents, Player, ServerState, ServerToClientEvents, SoundEffects, Team, Vector2 } from './types';

const sio: Socket<ServerToClientEvents, ClientToServerEvents> = io(process.env.SOCKET_URL as string);

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
canvas.addEventListener('click', canvasClickHandler);
canvas.addEventListener('pointermove', canvasPointerHandler);

let serverState: ServerState = {
  puckPos: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
  players: {},
  redScore: 0,
  bluScore: 0,
};

const pointerPosition: Vector2 = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };
const selectSoundEffect = (sound: SoundEffects): string => {
  switch (sound) {
    case SoundEffects.PlayerHitsPlayer:
      return 'Boom';
    case SoundEffects.PlayerHitsPuck:
      return 'Blip';
    case SoundEffects.PlayerHitsWall:
      return 'Hit';
    case SoundEffects.PuckHitsWall:
      return 'Clang';
    case SoundEffects.ScoreGoal:
      return 'PowerUp';
    default:
      assertNever(sound);
  }
};

function main() {
  sio.on('updateGameState', (newState: ServerState) => {
    playSounds(serverState, newState);
    serverState = newState;
  });

  startPreciseInterval(tick, TICKRATE_MS);
}

function playSounds(oldState: ServerState, newState: ServerState) {
  const { puckPos: oldPuckPos, players: oldPlayers, bluScore: oldBluScore, redScore: oldRedScore } = oldState;
  const { puckPos: newPuckPos, players: newPlayers, bluScore: newBluScore, redScore: newRedScore } = newState;
  if (newBluScore !== oldBluScore || newRedScore !== oldRedScore) {
    playSound(SoundEffects.ScoreGoal);
  }
  if (
    Math.abs(newPuckPos.y - oldPuckPos.y) > 0.5 &&
    (newPuckPos.y + PUCK_RADIUS >= ARENA_HEIGHT || newPuckPos.y - PUCK_RADIUS <= 0)
  ) {
    playSound(SoundEffects.PuckHitsWall);
  }
  for (const [id, newPlayer] of Object.entries(newPlayers)) {
    const oldPlayer = oldPlayers[id];
    // On the first frame of a player's existence, do nothing
    if (oldPlayer === undefined) {
      continue;
    }
    // Player has to be moving to create sound effects
    if (vectorDistance(newPlayer.position, oldPlayer.position) < 1) {
      continue;
    }
    if (vectorDistance(newPlayer.position, newPuckPos) < PUCK_RADIUS + PADDLE_RADIUS) {
      playSound(SoundEffects.PlayerHitsPuck);
    }
    if (newPlayer.position.y + PADDLE_RADIUS >= ARENA_HEIGHT || newPlayer.position.y - PADDLE_RADIUS <= 0) {
      playSound(SoundEffects.PlayerHitsWall);
    }
    for (const [otherId, otherPlayer] of Object.entries(newPlayers)) {
      if (otherId === id) {
        continue;
      }
      if (vectorDistance(newPlayer.position, oldPlayer.position) < 3) {
        continue;
      }
      if (vectorDistance(newPlayer.position, otherPlayer.position) < 2 * PADDLE_RADIUS) {
        playSound(SoundEffects.PlayerHitsPlayer);
      }
    }
  }
}

function vectorDistance(a: Vector2, b: Vector2) {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

function playSound(sound: SoundEffects) {
  const soundId = selectSoundEffect(sound);
  const audio = document.getElementById(soundId) as HTMLAudioElement;
  if (audio === null) {
    return;
  }
  audio.currentTime = 0;
  audio.play();
}

function tick() {
  clearCanvas();
  drawBackground();
  const self = extractSelf();
  if (self === undefined) {
    return;
  }
  drawGameplay();
  drawScore();
  if (self.team === Team.SPECTATOR) {
    drawTeamSelect();
  } else {
    sio.volatile.emit('requestPosition', pointerPosition);
  }
}

function drawTeamSelect() {
  const boldFont = 'bold 96px sans-serif';
  const regularFont = '96px sans-serif';
  const redSelected = pointerPosition.x < ARENA_WIDTH / 2;

  ctx.font = redSelected ? boldFont : regularFont;
  ctx.fillStyle = 'red';
  ctx.textAlign = 'left';
  ctx.fillText('JOIN RED', 0, ARENA_HEIGHT / 2);

  ctx.font = redSelected ? regularFont : boldFont;
  ctx.fillStyle = 'blue';
  ctx.textAlign = 'right';
  ctx.fillText('JOIN BLUE', ARENA_WIDTH, ARENA_HEIGHT / 2);
}

function drawBackground() {
  ctx.fillStyle = 'pink';
  ctx.fillRect(0, 0, ARENA_WIDTH / 2, ARENA_HEIGHT);

  ctx.fillStyle = 'lightblue';
  ctx.fillRect(ARENA_WIDTH / 2, 0, ARENA_WIDTH / 2, ARENA_HEIGHT);
}

function drawGameplay() {
  for (const [, player] of Object.entries(serverState.players)) {
    let playerColor = '';
    if (player.team === Team.RED) {
      playerColor = 'red';
    } else if (player.team === Team.BLU) {
      playerColor = 'blue';
    } else {
      continue;
    }
    drawCircle(player.position.x, player.position.y, PADDLE_RADIUS, playerColor);
  }
  drawCircle(serverState.puckPos.x, serverState.puckPos.y, PUCK_RADIUS, 'black');
}

function drawCircle(x: number, y: number, radius: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.stroke();
}

function drawScore() {
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = 'red';
  ctx.fillText(`${serverState.redScore}`, ARENA_WIDTH * (1 / 4), ARENA_HEIGHT / 4);

  ctx.fillStyle = 'blue';
  ctx.fillText(`${serverState.bluScore}`, ARENA_WIDTH * (3 / 4), ARENA_HEIGHT / 4);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function extractSelf(): Player | undefined {
  for (const [id, player] of Object.entries(serverState.players)) {
    if (id === sio.id) {
      return player;
    }
  }
}

function canvasClickHandler(event: PointerEvent) {
  const self = extractSelf();
  if (self === undefined || self.team !== Team.SPECTATOR) {
    return;
  }
  const { x } = canvasCoordinates(event);
  if (x < ARENA_WIDTH / 2) {
    sio.emit('joinTeam', Team.RED, pointerPosition);
  } else {
    sio.emit('joinTeam', Team.BLU, pointerPosition);
  }
}

function canvasPointerHandler(event: PointerEvent) {
  const { x, y } = canvasCoordinates(event);
  pointerPosition.x = x;
  pointerPosition.y = y;
}

function canvasCoordinates(event: PointerEvent): Vector2 {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
}

main();
