const spriteBase = '../../shared-assets/characters/ayue/test-sprites/normalized-v3/';
const frontWalkBase = '../../shared-assets/characters/ayue/test-sprites/walking-front-v4/';
const sprites = {
  front: `${spriteBase}ayue-idle-front-v3.webp`,
  back: `${spriteBase}ayue-idle-back-v3.webp`,
  left: `${spriteBase}ayue-idle-left-v3.webp`,
  right: `${spriteBase}ayue-idle-right-v3.webp`,
};
const walkFrames = {
  front: [
    `${frontWalkBase}ayue-walk-front-1-v4.png`,
    `${frontWalkBase}ayue-walk-front-2-v4.png`,
    `${frontWalkBase}ayue-walk-front-3-v4.png`,
    `${frontWalkBase}ayue-walk-front-4-v4.png`,
  ],
  back: [`${spriteBase}ayue-walk-back-a-v3.webp`, sprites.back],
  left: [`${spriteBase}ayue-walk-left-a-v3.webp`, sprites.left],
  right: [`${spriteBase}ayue-walk-right-a-v3.webp`, sprites.right],
};

const viewport = document.querySelector('#viewport');
const world = document.querySelector('#world');
const character = document.querySelector('#character');
const sprite = document.querySelector('#characterSprite');
const targetMarker = document.querySelector('#targetMarker');
const directionLabel = document.querySelector('#directionLabel');
const scaleLabel = document.querySelector('#scaleLabel');
const scaleControl = document.querySelector('#characterScale');
const doorAction = document.querySelector('#doorAction');
const doorHint = document.querySelector('#doorHint');
const enterButton = document.querySelector('#enterButton');
const roomDialog = document.querySelector('#roomDialog');
const dialogTitle = document.querySelector('#dialogTitle');
const dialogProgress = document.querySelector('#dialogProgress');
const progressLabel = document.querySelector('#progressLabel');
const simulateComplete = document.querySelector('#simulateComplete');
const returnDialog = document.querySelector('#returnDialog');
const returnTitle = document.querySelector('#returnTitle');
const returnMessage = document.querySelector('#returnMessage');

const state = {
  x: window.HSAIMapLayout.plazaSpawn.x,
  y: window.HSAIMapLayout.plazaSpawn.y,
  target: null,
  direction: 'front',
  keys: new Set(),
  speed: 17,
  lastTime: performance.now(),
  frameIndex: 0,
  frameElapsed: 0,
};

const directionNames = { front: '正面', back: '背面', left: '左向', right: '右向' };
const { bounds, plazaSpawn, rooms: roomLayout } = window.HSAIMapLayout;
const rooms = Object.fromEntries(window.GAILearnRooms.rooms.map((room) => [room.key, { ...room, ...roomLayout[room.key] }]));
let nearbyRoom = null;
let dialogRoom = null;

Object.entries(roomLayout).forEach(([key, layout]) => {
  const building = document.querySelector(`[data-building="${key}"]`);
  if (!building) return;
  building.style.left = `${layout.asset.left}%`;
  building.style.top = `${layout.asset.top}%`;
  building.style.width = `${layout.asset.width}%`;
});

function renderProgress(message = '') {
  const progress = window.GAILearnProgress.summary();
  progressLabel.textContent = `完成：${progress.completedCount}／${progress.totalRooms}`;
  Object.values(rooms).forEach((room) => {
    const building = document.querySelector(`[data-building="${Object.keys(rooms).find((key) => rooms[key] === room)}"]`);
    building?.classList.toggle('is-completed', Boolean(progress.state.completedRooms[room.id]?.completed));
  });
  if (message) dialogProgress.textContent = message;
  return progress;
}

function applyEntryRoute() {
  const entryId = new URLSearchParams(window.location.search).get('entry');
  document.querySelector('#entryTest').value = window.GAILearnRooms.get(entryId) ? entryId : '';
  const entryRoom = Object.values(rooms).find((room) => room.id === entryId);
  const spawn = entryRoom?.spawn || plazaSpawn;
  state.x = spawn.x;
  state.y = spawn.y;
  state.direction = spawn.direction;
  document.title = entryRoom?.mapEntryTitle || window.GAILearnRooms.mapTitle;
  directionLabel.textContent = `面向：${directionNames[state.direction]}`;
  if (entryId) {
    const entryStatus = document.createElement('span');
    entryStatus.textContent = entryRoom ? `入口：${entryRoom.name}` : '入口參數無效，已回到廣場';
    document.querySelector('.status').prepend(entryStatus);
  }
}

function applyReturnRoute() {
  const returnId = new URLSearchParams(window.location.search).get('return');
  if (!returnId) return;
  const returnedRoom = Object.values(rooms).find((room) => room.id === returnId);
  if (!returnedRoom) return;
  state.x = returnedRoom.spawn.x;
  state.y = returnedRoom.spawn.y;
  state.direction = returnedRoom.spawn.direction;
  directionLabel.textContent = `面向：${directionNames[state.direction]}`;

  const completed = window.GAILearnProgress.load().completedRooms[returnId]?.completed;
  if (!completed) {
    returnTitle.textContent = '尚無完成紀錄';
    returnMessage.textContent = `${returnedRoom.name} 的 return 參數只代表返回位置，不能作為通關證明。`;
    returnDialog.showModal();
    return;
  }

  const reward = window.GAILearnProgress.acknowledgeReward(returnId);
  returnTitle.textContent = reward.acknowledgedNow ? `取得「${returnedRoom.name}」徽章` : `返回「${returnedRoom.name}」`;
  returnMessage.textContent = reward.acknowledgedNow
    ? '首次授章提示已記錄；地圖完成數與房屋標記已更新。'
    : '此房已完成並領取過徽章，本次視為回顧，不重複授章或增加完成數。';
  returnDialog.showModal();
}

function setDirection(direction) {
  if (direction === state.direction) return;
  state.direction = direction;
  state.frameIndex = 0;
  state.frameElapsed = 0;
  directionLabel.textContent = `面向：${directionNames[direction]}`;
}

function updateAnimation(isMoving, seconds) {
  if (!isMoving) {
    state.frameIndex = 0;
    state.frameElapsed = 0;
    if (!sprite.src.endsWith(sprites[state.direction])) sprite.src = sprites[state.direction];
    sprite.dataset.motion = 'idle';
    sprite.dataset.direction = state.direction;
    return;
  }
  state.frameElapsed += seconds;
  const frameDuration = state.direction === 'front' ? .14 : (state.direction === 'back' ? .18 : .2);
  if (state.frameElapsed >= frameDuration) {
    state.frameElapsed %= frameDuration;
    state.frameIndex = (state.frameIndex + 1) % walkFrames[state.direction].length;
  }
  const nextFrame = walkFrames[state.direction][state.frameIndex];
  if (!sprite.src.endsWith(nextFrame)) sprite.src = nextFrame;
  sprite.dataset.motion = nextFrame.includes('walk-') ? 'walk' : 'idle';
  sprite.dataset.direction = state.direction;
}

function directionFromVector(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'back' : 'front';
}

function clampPosition() {
  state.x = Math.max(bounds.left, Math.min(bounds.right, state.x));
  state.y = Math.max(bounds.top, Math.min(bounds.bottom, state.y));
}

function isBlocked(x, y) {
  return Object.values(rooms).some(({ collision }) => x > collision.left && x < collision.right && y > collision.top && y < collision.bottom);
}

function updateDoorAction() {
  nearbyRoom = Object.values(rooms).find(({ door }) => Math.hypot(state.x - door.x, state.y - door.y) <= 5.2) || null;
  doorAction.hidden = !nearbyRoom;
  if (nearbyRoom) doorHint.textContent = nearbyRoom.name;
}

function render() {
  character.style.left = `${state.x}%`;
  character.style.top = `${state.y}%`;
  const depthProgress = (state.y - bounds.top) / (bounds.bottom - bounds.top);
  const depthScale = .92 + (Math.max(0, Math.min(1, depthProgress)) * .16);
  character.style.setProperty('--depth-scale', depthScale.toFixed(3));
  character.style.zIndex = String(8 + Math.round(state.y));
  updateDoorAction();
}

function move(dx, dy, seconds) {
  const length = Math.hypot(dx, dy) || 1;
  const stepX = (dx / length) * state.speed * seconds;
  const stepY = (dy / length) * state.speed * seconds;
  const nextX = state.x + stepX;
  const nextY = state.y + stepY;
  if (!isBlocked(nextX, state.y)) state.x = nextX;
  if (!isBlocked(state.x, nextY)) state.y = nextY;
  clampPosition();
  setDirection(directionFromVector(dx, dy));
  render();
}

function tick(now) {
  const seconds = Math.min((now - state.lastTime) / 1000, .05);
  state.lastTime = now;
  let dx = 0;
  let dy = 0;
  if (state.keys.has('ArrowLeft') || state.keys.has('a')) dx -= 1;
  if (state.keys.has('ArrowRight') || state.keys.has('d')) dx += 1;
  if (state.keys.has('ArrowUp') || state.keys.has('w')) dy -= 1;
  if (state.keys.has('ArrowDown') || state.keys.has('s')) dy += 1;

  let isMoving = false;
  if (dx || dy) {
    isMoving = true;
    state.target = null;
    targetMarker.style.display = 'none';
    move(dx, dy, seconds);
  } else if (state.target) {
    const tx = state.target.x - state.x;
    const ty = state.target.y - state.y;
    if (Math.hypot(tx, ty) < .7) {
      state.target = null;
      targetMarker.style.display = 'none';
    } else {
      isMoving = true;
      move(tx, ty, seconds);
    }
  }
  updateAnimation(isMoving, seconds);
  requestAnimationFrame(tick);
}

viewport.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button, input, .joystick')) return;
  const rect = world.getBoundingClientRect();
  state.target = {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
  state.target.x = Math.max(bounds.left, Math.min(bounds.right, state.target.x));
  state.target.y = Math.max(bounds.top, Math.min(bounds.bottom, state.target.y));
  targetMarker.style.left = `${state.target.x}%`;
  targetMarker.style.top = `${state.target.y}%`;
  targetMarker.style.display = 'block';
});

window.addEventListener('keydown', (event) => {
  const activeElement = document.activeElement;
  const isTextEntry = activeElement?.matches('input, textarea, select, [contenteditable="true"]');
  if (event.key === 'Escape') {
    if (roomDialog.open) roomDialog.close();
    else if (returnDialog.open) returnDialog.close();
    return;
  }
  if (event.key === 'Enter' && !event.repeat && !isTextEntry) {
    if (roomDialog.open) {
      event.preventDefault();
      simulateComplete.click();
    } else if (returnDialog.open) {
      event.preventDefault();
      returnDialog.close();
    } else if (nearbyRoom) {
      event.preventDefault();
      enterButton.click();
    }
    return;
  }
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(key)) {
    event.preventDefault();
    state.keys.add(key);
  }
});
window.addEventListener('keyup', (event) => state.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));

const joystickKeys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
document.querySelectorAll('.joystick button').forEach((button) => {
  const key = joystickKeys[button.dataset.dir];
  const start = (event) => { event.preventDefault(); state.keys.add(key); };
  const stop = () => state.keys.delete(key);
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('pointerleave', stop);
});

document.querySelectorAll('.building').forEach((building) => {
  building.addEventListener('click', () => {
    const room = rooms[building.dataset.building];
    state.target = { ...room.door };
    targetMarker.style.left = `${room.door.x}%`;
    targetMarker.style.top = `${room.door.y}%`;
    targetMarker.style.display = 'block';
  });
});

enterButton.addEventListener('click', () => {
  if (!nearbyRoom) return;
  dialogRoom = nearbyRoom;
  dialogTitle.textContent = dialogRoom.name;
  const completed = window.GAILearnProgress.load().completedRooms[dialogRoom.id]?.completed;
  dialogProgress.textContent = completed ? '本房已完成；再次進入視為回顧，不會重複計算。' : '本房尚未完成。';
  roomDialog.showModal();
  simulateComplete.focus();
});
document.querySelector('#closeDialog').addEventListener('click', () => roomDialog.close());
simulateComplete.addEventListener('click', () => {
  if (!dialogRoom) return;
  const roomUrl = new URL('../room-roundtrip-test/', window.location.href);
  roomUrl.searchParams.set('room_id', dialogRoom.id);
  const entryId = new URLSearchParams(window.location.search).get('entry');
  if (window.GAILearnRooms.get(entryId)) roomUrl.searchParams.set('entry', entryId);
  window.location.href = roomUrl.href;
});
document.querySelector('#closeReturnDialog').addEventListener('click', () => returnDialog.close());

scaleControl.addEventListener('input', () => {
  character.style.setProperty('--character-height', scaleControl.value);
  scaleLabel.textContent = `角色高度：${scaleControl.value}%`;
});

document.querySelector('#resetButton').addEventListener('click', () => {
  state.x = plazaSpawn.x; state.y = plazaSpawn.y; state.target = null;
  targetMarker.style.display = 'none';
  setDirection('front'); render();
});

document.querySelector('#testEntryButton').addEventListener('click', () => {
  const entryId = document.querySelector('#entryTest').value;
  const url = new URL(window.location.href);
  url.searchParams.delete('return');
  if (entryId) url.searchParams.set('entry', entryId);
  else url.searchParams.delete('entry');
  window.location.href = url.href;
});

applyEntryRoute();
applyReturnRoute();
sprite.src = sprites[state.direction];
sprite.dataset.motion = 'idle';
sprite.dataset.direction = state.direction;
renderProgress();
const preloadedImages = [];
Object.values(sprites).concat(Object.values(walkFrames).flat()).forEach((source) => {
  const preload = new Image();
  preload.src = source;
  if (preload.decode) preload.decode().catch(() => {});
  preloadedImages.push(preload);
});
render();
requestAnimationFrame(tick);
