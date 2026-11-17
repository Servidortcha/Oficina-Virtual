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
let avatarSeleccionado = 0;

const AVATAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

function avatarDataUrl(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${color}"/><circle cx="32" cy="24" r="10" fill="#fff"/><path d="M12 56 Q12 38 32 38 Q52 38 52 56" fill="#fff"/></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

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

function preload() {
  // No usamos load.image con data URIs porque Phaser no las soporta en preload
  // Las cargaremos como texturas base64 en create()
}

function create() {
  scene = this;

  // Cargar avatares como texturas base64 antes de crear los jugadores
  AVATAR_COLORS.forEach((color, i) => {
    const dataUrl = avatarDataUrl(color);
    const base64 = dataUrl.split(',')[1];
    this.textures.addBase64('avatar' + i, base64);
  });

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
      addPlayerSprite(pid, p.x, p.y, p.color, p.name, p.avatar, pid === myId);
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
    socket.emit('setName', { name: nombre, avatar: avatarSeleccionado });
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

  socket.on('playerJoined', ({ id, x, y, color, name, avatar }) => {
    addPlayerSprite(id, x, y, color, name, avatar, false);
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

function addPlayerSprite(id, x, y, color, name, avatar, esLocal) {
  const avatarIndex = (typeof avatar === 'number') ? avatar : 0;
  const avatarKey = 'avatar' + avatarIndex;

  const sprite = scene.add.image(x, y, avatarKey);
  sprite.setDisplaySize(32, 32);
  sprite.setDepth(1);

  if (esLocal) {
    scene.physics.add.existing(sprite);
    sprite.body.setCircle(16, 0, 0);
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

// Generar el grid de avatares en el overlay
function generarAvatarGrid() {
  const grid = document.getElementById('avatarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  AVATAR_COLORS.forEach((color, i) => {
    const div = document.createElement('div');
    div.className = 'avatar-option' + (i === avatarSeleccionado ? ' selected' : '');
    div.dataset.index = i;

    const img = document.createElement('img');
    img.src = avatarDataUrl(color);
    img.alt = 'Avatar ' + (i + 1);
    div.appendChild(img);

    div.addEventListener('click', () => {
      avatarSeleccionado = i;
      document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
    });

    grid.appendChild(div);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  generarAvatarGrid();

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