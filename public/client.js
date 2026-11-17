let socket;
let game;
let scene;
let myId = null;
let myName = null;
const sprites = {};
const labels = {};
let chatInput, sendBtn, messagesDiv, statusDiv;
let paredes;
let gruposZonas;
let mundoAncho = 1000;
let mundoAlto = 700;
let jugadoresIniciales = {};
let mapaInicial = null;

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
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

  paredes = this.physics.add.staticGroup();
  gruposZonas = this.add.group();

  if (mapaInicial) {
    mapaInicial.paredes.forEach(p => {
      const wall = scene.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x444444);
      wall.setStrokeStyle(1, 0x666666);
      paredes.add(wall);
    });

    mapaInicial.zonas.forEach(z => {
      const txt = scene.add.text(z.x, z.y, z.texto, {
        fontSize: '20px',
        color: '#ffd700',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5).setDepth(0);
      gruposZonas.add(txt);
    });

    this.cameras.main.setBounds(0, 0, mundoAncho, mundoAlto);

    for (const [pid, p] of Object.entries(jugadoresIniciales)) {
      addPlayerSprite(pid, p.x, p.y, p.color, p.name, pid === myId);
    }

    if (sprites[myId]) {
      this.physics.add.collider(sprites[myId], paredes);
      this.cameras.main.startFollow(sprites[myId], true, 0.08, 0.08);
    }
  }

  this.cursors = this.input.keyboard.createCursorKeys();
  this.wasd = this.input.keyboard.addKeys('W,A,S,D');

  sendBtn.addEventListener('click', sendChat);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
  });

  this.lastSent = 0;
}

function update() {
  if (!myId || !sprites[myId]) return;

  const sprite = sprites[myId];
  const body = sprite.body;
  if (!body) return;

  body.setVelocity(0);

  const speed = 160;
  const cursors = this.cursors;
  const wasd = this.wasd;

  if (cursors.left.isDown || wasd.A.isDown) body.setVelocityX(-speed);
  if (cursors.right.isDown || wasd.D.isDown) body.setVelocityX(speed);
  if (cursors.up.isDown || wasd.W.isDown) body.setVelocityY(-speed);
  if (cursors.down.isDown || wasd.S.isDown) body.setVelocityY(speed);

  const now = Date.now();
  if (now - this.lastSent > 100) {
    socket.emit('move', { x: sprite.x, y: sprite.y });
    this.lastSent = now;
  }
}

function conectarYUnirse(nombre) {
  myName = nombre;

  const overlay = document.getElementById('overlay');
  const joinBtn = document.getElementById('joinBtn');
  const joinError = document.getElementById('joinError');

  joinBtn.disabled = true;
  joinBtn.textContent = 'Conectando...';

  statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Conectando al servidor...';
  statusDiv.style.background = 'rgba(0, 0, 0, 0.6)';

  socket = io();

  socket.on('connect', () => {
    socket.emit('setName', { name: nombre });
  });

  socket.on('init', ({ id, players, me, mapa }) => {
    myId = id;
    mundoAncho = mapa.ancho;
    mundoAlto = mapa.alto;
    mapaInicial = mapa;
    jugadoresIniciales = players;

    statusDiv.textContent = `Conectado como ${me}`;
    statusDiv.style.background = 'rgba(0, 128, 0, 0.6)';

    if (overlay) overlay.style.display = 'none';

    if (!game) {
      game = new Phaser.Game(config);
    }
  });

  socket.on('serverFull', () => {
    statusDiv.textContent = 'Servidor lleno (máximo 4 jugadores)';
    statusDiv.style.background = 'rgba(128, 0, 0, 0.6)';
    joinBtn.disabled = false;
    joinBtn.textContent = 'Entrar a la oficina';
  });

  socket.on('playerJoined', ({ id, x, y, color, name }) => {
    addPlayerSprite(id, x, y, color, name, false);
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
}

function addPlayerSprite(id, x, y, color, name, esLocal) {
  const sprite = scene.add.circle(x, y, 14, color);
  sprite.setStrokeStyle(2, 0xffffff);
  sprite.setDepth(1);

  if (esLocal) {
    scene.physics.add.existing(sprite);
    sprite.body.setCircle(14, 0, 0);
    sprite.body.setCollideWorldBounds(true);
  }

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
  const joinBtn = document.getElementById('joinBtn');
  const playerName = document.getElementById('playerName');
  const joinError = document.getElementById('joinError');

  joinBtn.addEventListener('click', () => {
    const nombre = playerName.value.trim();
    if (!nombre) {
      joinError.textContent = 'Escribí tu nombre';
      return;
    }
    joinError.textContent = '';
    conectarYUnirse(nombre);
  });

  playerName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinBtn.click();
  });
});