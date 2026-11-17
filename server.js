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
const players = {}; // socket.id -> { x, y, color, name }

io.on('connection', (socket) => {
  const playerCount = Object.keys(players).length;

  if (playerCount >= MAX_PLAYERS) {
    socket.emit('serverFull');
    socket.disconnect(true);
    return;
  }

  const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  const startX = 200 + Math.random() * 400;
  const startY = 200 + Math.random() * 400;

  players[socket.id] = {
    x: startX,
    y: startY,
    color,
    name: `Jugador ${Object.keys(players).length + 1}`
  };

  // Enviar al nuevo jugador el estado actual del mundo
  socket.emit('init', { id: socket.id, players, me: socket.id });

  // Avisar a los demás que alguien se unió
  socket.broadcast.emit('playerJoined', { id: socket.id, ...players[socket.id] });

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
    io.emit('chatMessage', msg); // Todos reciben el mensaje
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
