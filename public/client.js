let socket;
let game;
let scene;
let myId = null;
let myName = null;
const sprites = {};
const labels = {};
const spriteColors = {};
let chatInput, sendBtn, messagesDiv, statusDiv;
let paredes;
let muebles;
let gruposZonas;
let mundoAncho = 1100;
let mundoAlto = 800;
let jugadoresIniciales = {};
let mapaInicial = null;
let avatarSeleccionado = 0;

const AVATAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

function shadeColor(color, percent) {
  let R = parseInt(color.substring(1,3),16);
  let G = parseInt(color.substring(3,5),16);
  let B = parseInt(color.substring(5,7),16);
  R = Math.floor(R * (100 + percent) / 100);
  G = Math.floor(G * (100 + percent) / 100);
  B = Math.floor(B * (100 + percent) / 100);
  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));
  const hex = ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
  return '#' + hex.padStart(6, '0');
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game',
  backgroundColor: '#2c3e50',
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

  // Generar frames de caminata para cada color
  AVATAR_COLORS.forEach((color, i) => {
    generarFramesPersona(scene, color, i);
  });

  statusDiv = document.getElementById('status');
  chatInput = document.getElementById('chatInput');
  sendBtn = document.getElementById('sendBtn');
  messagesDiv = document.getElementById('messages');

  paredes = this.physics.add.staticGroup();
  muebles = this.physics.add.staticGroup();
  gruposZonas = this.add.group();

  if (mapaInicial) {
    mapaInicial.paredes.forEach(p => {
      const wall = scene.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, parseInt(p.color.replace('#',''), 16));
      wall.setStrokeStyle(1, 0x333333);
      paredes.add(wall);
    });

    mapaInicial.muebles.forEach(m => {
      const furniture = scene.add.rectangle(m.x + m.w / 2, m.y + m.h / 2, m.w, m.h, parseInt(m.color.replace('#',''), 16));
      furniture.setStrokeStyle(2, 0xffffff);
      furniture.setDepth(1);
      muebles.add(furniture);

      const label = scene.add.text(m.x + m.w / 2, m.y + m.h / 2, m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1), {
        fontSize: '10px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 2,
        align: 'center'
      }).setOrigin(0.5).setDepth(2);
    });

    mapaInicial.zonas.forEach(z => {
      const txt = scene.add.text(z.x, z.y, z.texto, {
        fontSize: '22px',
        color: z.color,
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5).setDepth(0);

      scene.tweens.add({
        targets: txt,
        scale: 1.1,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      gruposZonas.add(txt);
    });

    this.cameras.main.setBounds(0, 0, mundoAncho, mundoAlto);

    for (const [pid, p] of Object.entries(jugadoresIniciales)) {
      addPlayerSprite(pid, p.x, p.y, p.color, p.name, p.avatar, pid === myId);
    }

    if (sprites[myId]) {
      this.physics.add.collider(sprites[myId], paredes);
      this.physics.add.collider(sprites[myId], muebles);
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

  const speed = 150;
  const cursors = this.cursors;
  const wasd = this.wasd;

  if (cursors.left.isDown || wasd.A.isDown) body.setVelocityX(-speed);
  if (cursors.right.isDown || wasd.D.isDown) body.setVelocityX(speed);
  if (cursors.up.isDown || wasd.W.isDown) body.setVelocityY(-speed);
  if (cursors.down.isDown || wasd.S.isDown) body.setVelocityY(speed);

  const colorIndex = AVATAR_COLORS.indexOf(spriteColors[myId]);
  const walkKey = 'walk_' + colorIndex;
  const idleKey = 'idle_' + colorIndex;

  const moving = body.velocity.x !== 0 || body.velocity.y !== 0;

  if (moving) {
    if (!sprite.anims.isPlaying || sprite.anims.currentAnim.key !== walkKey) {
      sprite.anims.play(walkKey);
    }
  } else {
    if (sprite.anims.isPlaying) {
      sprite.anims.stop();
      sprite.setTexture(idleKey);
    }
  }

  const now = Date.now();
  if (now - this.lastSent > 100) {
    socket.emit('move', { x: sprite.x, y: sprite.y });
    this.lastSent = now;
  }
}

function generarFramesPersona(scene, color, index) {
  const w = 34;
  const h = 46;
  const piel = '#ffdbac';
  const ropaOscura = shadeColor(color, -25);

  const g0 = scene.add.graphics();
  dibujarPersona(g0, color, w, h, 0);
  const keyIdle = 'idle_' + index;
  g0.generateTexture(keyIdle, w, h);
  g0.destroy();

  const g1 = scene.add.graphics();
  dibujarPersona(g1, color, w, h, 1);
  const keyWalk1 = 'walk1_' + index;
  g1.generateTexture(keyWalk1, w, h);
  g1.destroy();

  const g2 = scene.add.graphics();
  dibujarPersona(g2, color, w, h, 0);
  const keyWalk2 = 'walk2_' + index;
  g2.generateTexture(keyWalk2, w, h);
  g2.destroy();

  const g3 = scene.add.graphics();
  dibujarPersona(g3, color, w, h, 2);
  const keyWalk3 = 'walk3_' + index;
  g3.generateTexture(keyWalk3, w, h);
  g3.destroy();

  scene.anims.create({
    key: 'walk_' + index,
    frames: [
      { key: keyWalk1 },
      { key: keyWalk2 },
      { key: keyWalk3 },
      { key: keyWalk2 }
    ],
    frameRate: 10,
    repeat: -1
  });
}

function dibujarPersona(graphics, color, w, h, paso) {
  const cx = w / 2;
  const cy = h / 2;
  const piel = '#ffdbac';
  const ropaOscura = shadeColor(color, -25);

  graphics.fillStyle(0x000000, 0.25);
  graphics.fillEllipse(cx, cy + 10, w/2, 4);

  let piernaIzqX = cx - 8;
  let piernaDerX = cx + 2;
  let piernaIzqY = cy + 4;
  let piernaDerY = cy + 4;

  if (paso === 1) {
    piernaIzqX = cx - 10;
    piernaDerX = cx + 4;
  } else if (paso === 2) {
    piernaIzqX = cx - 6;
    piernaDerX = cx + 6;
  }

  graphics.fillStyle(ropaOscura, 1);
  graphics.fillRect(piernaIzqX, piernaIzqY, 6, 12);
  graphics.fillRect(piernaDerX, piernaDerY, 6, 12);

  let brazoIzqX = cx - 14;
  let brazoDerX = cx + 8;
  if (paso === 1) { brazoIzqX = cx - 12; brazoDerX = cx + 10; }
  if (paso === 2) { brazoIzqX = cx - 16; brazoDerX = cx + 6; }

  graphics.fillRect(brazoIzqX, cy - 8, 6, 14);
  graphics.fillRect(brazoDerX, cy - 8, 6, 14);

  graphics.fillStyle(color, 1);
  graphics.fillRect(cx - 7, cy - 4, 14, 18);

  graphics.fillStyle(piel, 1);
  graphics.fillRect(cx - 3, cy - 10, 6, 6);

  graphics.fillStyle(piel, 1);
  graphics.fillCircle(cx, cy - 14, 8);

  graphics.fillStyle(0x333333, 1);
  graphics.fillCircle(cx - 2.5, cy - 16, 1.5);
  graphics.fillCircle(cx + 2.5, cy - 16, 1.5);

  graphics.lineStyle(1.5, 0x333333, 1);
  graphics.beginPath();
  graphics.arc(cx, cy - 12, 3, 0.2, Math.PI - 0.2);
  graphics.strokePath();

  graphics.fillStyle(color, 1);
  graphics.beginPath();
  graphics.moveTo(cx - 8, cy - 22);
  graphics.lineTo(cx, cy - 26);
  graphics.lineTo(cx + 8, cy - 22);
  graphics.lineTo(cx + 8, cy - 14);
  graphics.lineTo(cx - 8, cy - 14);
  graphics.closePath();
  graphics.fillPath();
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

    statusDiv.textContent = 'Conectado como ' + me;
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
      labels[id].setPosition(x, y - 32);
    }
  });

  socket.on('playerLeft', ({ id }) => {
    if (sprites[id]) {
      sprites[id].destroy();
      labels[id].destroy();
      delete sprites[id];
      delete labels[id];
      delete spriteColors[id];
    }
  });

  socket.on('chatMessage', ({ id, text }) => {
    addChatMessage(id, text);
    showBubble(id, text);
  });
}

function addPlayerSprite(id, x, y, color, name, avatar, esLocal) {
  const avatarIndex = (typeof avatar === 'number') ? avatar : 0;
  const baseColor = AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length];
  spriteColors[id] = baseColor;

  const idleKey = 'idle_' + avatarIndex;

  const sprite = scene.add.sprite(x, y, idleKey);
  sprite.setDepth(2);

  if (esLocal) {
    scene.physics.add.existing(sprite);
    sprite.body.setCircle(17, 0, 0);
    sprite.body.setCollideWorldBounds(true);
  }

  const label = scene.add.text(x, y - 32, name, {
    fontSize: '14px',
    color: '#fff',
    stroke: '#000',
    strokeThickness: 3,
    align: 'center'
  }).setOrigin(0.5).setDepth(3);

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
  }).setOrigin(0.5).setDepth(4);

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
  div.innerHTML = '<span class="from">' + name + ':</span> ' + text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendChat() {
  const text = chatInput.value.trim();
  if (!text || !socket) return;
  socket.emit('chatMessage', { text });
  chatInput.value = '';
}

function generarAvatarGrid() {
  const grid = document.getElementById('avatarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  AVATAR_COLORS.forEach((color, i) => {
    const div = document.createElement('div');
    div.className = 'avatar-option' + (i === avatarSeleccionado ? ' selected' : '');
    div.dataset.index = i;

    const preview = document.createElement('div');
    preview.style.width = '40px';
    preview.style.height = '40px';
    preview.style.backgroundColor = color;
    preview.style.borderRadius = '50%';
    preview.style.border = '2px solid #fff';
    preview.style.margin = '0 auto';
    div.appendChild(preview);

    const label = document.createElement('div');
    label.textContent = 'Estilo ' + (i + 1);
    label.style.fontSize = '10px';
    label.style.color = '#ccc';
    label.style.textAlign = 'center';
    label.style.marginTop = '4px';
    div.appendChild(label);

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