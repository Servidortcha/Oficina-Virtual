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
  ancho: 1100,
  alto: 800,
  paredes: [
    // Perímetro
    { x: 0, y: 0, w: 1100, h: 20, tipo: 'pared', color: '#555555' },
    { x: 0, y: 780, w: 1100, h: 20, tipo: 'pared', color: '#555555' },
    { x: 0, y: 0, w: 20, h: 800, tipo: 'pared', color: '#555555' },
    { x: 1080, y: 0, w: 20, h: 800, tipo: 'pared', color: '#555555' },

    // Oficina 1 (arriba izquierda)
    { x: 100, y: 80, w: 350, h: 20, tipo: 'pared', color: '#555555' },
    { x: 450, y: 80, w: 20, h: 120, tipo: 'pared', color: '#555555' },
    { x: 450, y: 240, w: 20, h: 120, tipo: 'pared', color: '#555555' },
    { x: 100, y: 360, w: 350, h: 20, tipo: 'pared', color: '#555555' },

    // Oficina 2 (arriba derecha)
    { x: 650, y: 80, w: 350, h: 20, tipo: 'pared', color: '#555555' },
    { x: 1000, y: 80, w: 20, h: 120, tipo: 'pared', color: '#555555' },
    { x: 1000, y: 240, w: 20, h: 120, tipo: 'pared', color: '#555555' },
    { x: 650, y: 360, w: 350, h: 20, tipo: 'pared', color: '#555555' },

    // Oficina 3 (abajo izquierda)
    { x: 100, y: 440, w: 350, h: 20, tipo: 'pared', color: '#555555' },
    { x: 450, y: 440, w: 20, h: 120, tipo: 'pared', color: '#555555' },
    { x: 450, y: 600, w: 20, h: 120, tipo: 'pared', color: '#555555' },
    { x: 100, y: 760, w: 350, h: 20, tipo: 'pared', color: '#555555' },

    // Separador Sala de estar
    { x: 470, y: 100, w: 20, h: 340, tipo: 'pared', color: '#555555' },
    { x: 470, y: 500, w: 20, h: 200, tipo: 'pared', color: '#555555' },
  ],
  muebles: [
    // Oficina 1 - escritorio, silla, planta
    { x: 180, y: 180, w: 120, h: 60, tipo: 'escritorio', color: '#8d6e63' },
    { x: 260, y: 180, w: 30, h: 50, tipo: 'silla', color: '#5d4037' },
    { x: 330, y: 200, w: 25, h: 40, tipo: 'planta', color: '#4caf50' },

    // Oficina 2 - escritorio, silla, estante
    { x: 730, y: 180, w: 120, h: 60, tipo: 'escritorio', color: '#8d6e63' },
    { x: 810, y: 180, w: 30, h: 50, tipo: 'silla', color: '#5d4037' },
    { x: 900, y: 120, w: 40, h: 100, tipo: 'estante', color: '#795548' },

    // Oficina 3 - mesa de reunion y sillas
    { x: 180, y: 540, w: 140, h: 80, tipo: 'mesa', color: '#6d4c41' },
    { x: 150, y: 560, w: 25, h: 40, tipo: 'silla', color: '#4e342e' },
    { x: 290, y: 560, w: 25, h: 40, tipo: 'silla', color: '#4e342e' },

    // Sala de estar - sofa, mesa, planta, TV
    { x: 550, y: 500, w: 160, h: 40, tipo: 'sofa', color: '#37474f' },
    { x: 630, y: 580, w: 80, h: 50, tipo: 'mesa', color: '#5d4037' },
    { x: 800, y: 520, w: 30, h: 60, tipo: 'planta', color: '#66bb6a' },
    { x: 900, y: 300, w: 100, h: 60, tipo: 'tv', color: '#263238' },
  ],
  zonas: [
    { x: 270, y: 200, texto: "Oficina 1", color: "#ffab91" },
    { x: 820, y: 200, texto: "Oficina 2", color: "#90caf9" },
    { x: 270, y: 580, texto: "Oficina 3", color: "#a5d6a7" },
    { x: 750, y: 450, texto: "Sala de estar", color: "#ce93d8" },
  ]
};

const posicionesIniciales = [
  { x: 750, y: 450 }, // Sala de estar
  { x: 220, y: 220 }, // Oficina 1
  { x: 800, y: 220 }, // Oficina 2
  { x: 220, y: 580 }, // Oficina 3
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
    const pos = posicionesIniciales[playerCount] || { x: 500, y: 400 };

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