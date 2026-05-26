import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Game from './Game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// Serve built client in production
app.use(express.static(join(__dirname, '../client/dist')));
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

const games = new Map(); // roomId -> Game

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('createRoom', (playerName, callback) => {
    const roomId = generateRoomId();
    const game = new Game(roomId, io);
    games.set(roomId, game);

    currentRoom = roomId;
    socket.join(roomId);
    game.addPlayer(socket.id, playerName);

    callback({ roomId, playerId: socket.id });
  });

  socket.on('joinRoom', (roomId, playerName, callback) => {
    const game = games.get(roomId);
    if (!game) {
      callback({ error: 'Room not found' });
      return;
    }
    if (game.state !== 'lobby') {
      callback({ error: 'Game already in progress' });
      return;
    }

    currentRoom = roomId;
    socket.join(roomId);
    game.addPlayer(socket.id, playerName);

    callback({ roomId, playerId: socket.id });

    // Send draw history to new player
    if (game.drawHistory.length > 0) {
      socket.emit('drawHistory', game.drawHistory);
    }
  });

  socket.on('startGame', () => {
    const game = games.get(currentRoom);
    if (game) game.startGame();
  });

  socket.on('pickWord', (word) => {
    const game = games.get(currentRoom);
    if (game) game.pickWord(socket.id, word);
  });

  socket.on('guess', (guess) => {
    const game = games.get(currentRoom);
    if (!game) return;

    const result = game.handleGuess(socket.id, guess);
    if (!result) return;

    if (!result.correct) {
      // Broadcast the guess as a chat message
      const player = game.players.get(socket.id);
      game.broadcast('chatMessage', {
        playerId: socket.id,
        playerName: player?.name || 'Unknown',
        message: guess,
      });
    }
  });

  socket.on('draw', (data) => {
    const game = games.get(currentRoom);
    if (!game) return;
    if (socket.id !== game.getCurrentDrawerId()) return;

    game.drawHistory.push(data);
    socket.to(currentRoom).emit('draw', data);
  });

  socket.on('clearCanvas', () => {
    const game = games.get(currentRoom);
    if (!game) return;
    if (socket.id !== game.getCurrentDrawerId()) return;

    game.drawHistory = [];
    socket.to(currentRoom).emit('clearCanvas');
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const game = games.get(currentRoom);
      if (game) {
        game.removePlayer(socket.id);
        if (game.players.size === 0) {
          game.clearTimer();
          games.delete(currentRoom);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
