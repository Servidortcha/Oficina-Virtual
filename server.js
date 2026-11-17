const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const MAX_PLAYERS = 4;
const players = {};

const mapa = {
  ancho: 1000,
  alto: 700,
  paredes: [
    { x: 0, y: 0, w: 1000, h: 20 },
    { x: 0, y: 680, w: 1000, h: 20 },
    { x: 0, y: 0, w: 20, h: 700 },
    { x: 980, y: 0, w: 20, h: 700 },
    { x: 100, y: 80, w: 300, h: 20 },
    { x: 400, y: 80, w: 20, h: 100 },
    { x: 400, y: 220, w: 20, h: 100 },
    { x: 100, y: 300, w: 300, h: 20 },
    { x: 600, y: 80, w: 300, h: 20 },
    { x: 900, y: 80, w: 20, h: 100 },
    { x: 900, y: 220, w: 20, h: 100 },
    { x: 600, y: 300, w: 300, h: 20 },
    { x: 100, y: 380, w: 300, h: 20 },
    { x: 400, y: 380, w: 20, h: 100 },
    { x: 400, y: 520, w: 20, h: 100 },
    { x: 100, y: 620, w: 300, h: 20 },
    { x: 420, y: 100, w: 20, h: 300 },
    { x: 420, y: 440, w: 20, h: 200 },
  ],
  zonas: [
    { x: 250, y: 150, texto: "Oficina 1" },
    { x: 750, y: 150, texto: "Oficina 2" },
    { x: 250, y: 450, texto: "Oficina 3" },
    { x: 700, y: 450, texto: "Sala de estar" },
  ]
};

const posicionesIniciales = [
  { x: 700, y: 450 },
  { x: 200, y: 200 },
  { x: 700, y: 200 },
  { x: 200, y: 500 },
];

io.on('connection', (socket) => {
  const playerCount = Object.keys(players).length;

  if (playerCount >= MAX_PLAYERS) {
    socket.emit('serverFull');
    socket.disconnect(true);
    return;
  }

  socket.on('setName', (data) => {
    const name = data && data.name ? data.name.trim() : `Jugador ${playerCount + 1}`;
    const avatar = (data && typeof data.avatar === 'number') ? data.avatar : 0;
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    const pos = posicionesIniciales[playerCount] || { x: 500, y: 350 };

    players[socket.id] = {
      x: pos.x,
      y: pos.y,
      color,
      name,
      avatar
    };

    socket.emit('init', { id: socket.id, players, me: socket.id, mapa });
    socket.broadcast.emit('playerJoined', { id: socket.id, ...players[socket.id] });
  });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, y: data.y });
    }
  });

  socket.on('chatMessage', (data) => {
    const msg = {
      id: socket.id,
      text: data.text,
      timestamp: Date.now()
    };
    io.emit('chatMessage', msg);
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      io.emit('playerLeft', { id: socket.id });
      delete players[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});