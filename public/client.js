let socket;
let game;
let scene;
let myId = null;
const sprites = {};
const labels = {};
let chatInput, sendBtn, messagesDiv, statusDiv;

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

function preload() {}

function create() {
  scene = this;

  statusDiv = document.getElementById('status');
  chatInput = document.getElementById('chatInput');
  sendBtn = document.getElementById('sendBtn');
  messagesDiv = document.getElementById('messages');

  // Conectar al servidor por WebSocket
  socket = io();

  socket.on('init', ({ id, players, me }) => {
    myId = id;
    statusDiv.textContent = `Conectado como ${me}`;
    statusDiv.style.background = 'rgba(0, 128, 0, 0.6)';

    for (const [pid, p] of Object.entries(players)) {
      addPlayerSprite(pid, p.x, p.y, p.color, p.name);
    }
  });

  socket.on('serverFull', () => {
    statusDiv.textContent = 'Servidor lleno (máximo 4 jugadores)';
    statusDiv.style.background = 'rgba(128, 0, 0, 0.6)';
  });

  socket.on('playerJoined', ({ id, x, y, color, name }) => {
    addPlayerSprite(id, x, y, color, name);
  });

  socket.on('playerMoved', ({ id, x, y }) => {
    if (sprites[id]) {
      sprites[id].setPosition(x, y);
      labels[id].setPosition(x, y - 28);
    }
  });

  socket.on('playerLeft', ({ id }) => {
    if (sprites[id]) {
      sprites[id].destroy();
      labels[id].destroy();
      delete sprites[id];
      delete labels[id];
    }
  });

  socket.on('chatMessage', ({ id, text }) => {
    addChatMessage(id, text);
    showBubble(id, text);
  });

  // Controles de teclado
  this.cursors = this.input.keyboard.createCursorKeys();
  this.wasd = this.input.keyboard.addKeys('W,A,S,D');

  // Chat
  sendBtn.addEventListener('click', sendChat);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
  });

  this.lastSent = 0;
}

function update() {
  if (!myId || !sprites[myId]) return;

  const sprite = sprites[myId];
  sprite.setVelocity(0);

  const speed = 200;
  const cursors = this.cursors;
  const wasd = this.wasd;

  if (cursors.left.isDown || wasd.A.isDown) sprite.setVelocityX(-speed);
  if (cursors.right.isDown || wasd.D.isDown) sprite.setVelocityX(speed);
  if (cursors.up.isDown || wasd.W.isDown) sprite.setVelocityY(-speed);
  if (cursors.down.isDown || wasd.S.isDown) sprite.setVelocityY(speed);

  // Enviar posición al servidor cada 100 ms
  const now = Date.now();
  if (now - this.lastSent > 100) {
    socket.emit('move', { x: sprite.x, y: sprite.y });
    this.lastSent = now;
  }
}

function addPlayerSprite(id, x, y, color, name) {
  const sprite = scene.add.circle(x, y, 14, color);
  sprite.setStrokeStyle(2, 0xffffff);
  sprite.setDepth(1);

  const label = scene.add.text(x, y - 28, name, {
    fontSize: '14px',
    color: '#fff',
    stroke: '#000',
    strokeThickness: 3,
    align: 'center'
  }).setOrigin(0.5).setDepth(2);

  sprites[id] = sprite;
  labels[id] = label;
}

function showBubble(id, text) {
  if (!labels[id]) return;

  const bubble = scene.add.text(labels[id].x, labels[id].y - 45, text, {
    fontSize: '12px',
    color: '#000',
    backgroundColor: '#fff',
    padding: { x: 6, y: 3 },
    align: 'center'
  }).setOrigin(0.5).setDepth(3);

  scene.tweens.add({
    targets: bubble,
    y: labels[id].y - 65,
    alpha: 0,
    duration: 2000,
    onComplete: () => bubble.destroy()
  });
}

function addChatMessage(id, text) {
  const div = document.createElement('div');
  div.className = 'msg';
  const name = id === myId ? 'Tú' : id.substring(0, 4);
  div.innerHTML = `<span class="from">${name}:</span> ${text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendChat() {
  const text = chatInput.value.trim();
  if (!text || !socket) return;
  socket.emit('chatMessage', { text });
  chatInput.value = '';
}

window.addEventListener('DOMContentLoaded', () => {
  game = new Phaser.Game(config);
});
