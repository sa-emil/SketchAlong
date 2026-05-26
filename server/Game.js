import { getRandomWords } from './words.js';

const ROUND_TIME = 60;
const MAX_ROUNDS = 3;

export default class Game {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.players = new Map(); // socketId -> { name, score }
    this.state = 'lobby'; // lobby | picking | drawing | roundEnd | gameOver
    this.currentDrawerIndex = 0;
    this.currentWord = null;
    this.wordChoices = [];
    this.round = 1;
    this.timeLeft = ROUND_TIME;
    this.timer = null;
    this.drawersThisRound = new Set();
    this.guessedPlayers = new Set();
    this.drawHistory = [];
  }

  addPlayer(socketId, name) {
    this.players.set(socketId, { name, score: 0 });
    this.broadcast('playerJoined', this.getPublicState());
  }

  removePlayer(socketId) {
    const wasDrawing = this.getCurrentDrawerId() === socketId;
    this.players.delete(socketId);

    if (this.players.size < 2) {
      this.endGame('Not enough players');
      return;
    }

    if (wasDrawing && this.state === 'drawing') {
      this.clearTimer();
      this.nextTurn();
    }

    this.broadcast('playerLeft', this.getPublicState());
  }

  getPlayerOrder() {
    return [...this.players.keys()];
  }

  getCurrentDrawerId() {
    const order = this.getPlayerOrder();
    if (order.length === 0) return null;
    return order[this.currentDrawerIndex % order.length];
  }

  startGame() {
    if (this.players.size < 2) return;
    this.state = 'picking';
    this.round = 1;
    this.currentDrawerIndex = 0;
    this.drawersThisRound = new Set();
    this.players.forEach(p => (p.score = 0));
    this.nextTurn();
  }

  nextTurn() {
    this.guessedPlayers.clear();
    this.drawHistory = [];
    this.currentWord = null;
    this.broadcast('clearCanvas');

    const order = this.getPlayerOrder();

    // Find next drawer who hasn't drawn this round
    let found = false;
    for (let i = 0; i < order.length; i++) {
      const idx = (this.currentDrawerIndex + i) % order.length;
      if (!this.drawersThisRound.has(order[idx])) {
        this.currentDrawerIndex = idx;
        found = true;
        break;
      }
    }

    if (!found) {
      // Everyone drew this round, advance to next round
      this.round++;
      if (this.round > MAX_ROUNDS) {
        this.endGame();
        return;
      }
      this.drawersThisRound.clear();
      this.currentDrawerIndex = 0;
    }

    this.state = 'picking';
    this.wordChoices = getRandomWords(3);
    const drawerId = this.getCurrentDrawerId();

    // Send word choices only to drawer
    this.io.to(drawerId).emit('wordChoices', this.wordChoices);
    this.broadcast('turnStart', {
      ...this.getPublicState(),
      drawer: drawerId,
    });
  }

  pickWord(socketId, word) {
    if (socketId !== this.getCurrentDrawerId()) return;
    if (!this.wordChoices.includes(word)) return;

    this.currentWord = word;
    this.wordChoices = [];
    this.state = 'drawing';
    this.timeLeft = ROUND_TIME;
    this.drawersThisRound.add(socketId);

    // Send word hint (underscores) to everyone except drawer
    const hint = this.currentWord.replace(/[a-zA-Z]/g, '_');
    this.broadcast('drawingStart', {
      ...this.getPublicState(),
      hint,
      wordLength: this.currentWord.length,
    });

    // Send actual word to drawer
    this.io.to(socketId).emit('yourWord', this.currentWord);

    this.startTimer();
  }

  handleGuess(socketId, guess) {
    if (this.state !== 'drawing') return null;
    if (socketId === this.getCurrentDrawerId()) return null;
    if (this.guessedPlayers.has(socketId)) return null;

    const normalized = guess.trim().toLowerCase();
    const isCorrect = normalized === this.currentWord.toLowerCase();

    if (isCorrect) {
      this.guessedPlayers.add(socketId);
      const player = this.players.get(socketId);
      const drawer = this.players.get(this.getCurrentDrawerId());

      // More points for guessing earlier
      const timeBonus = Math.round((this.timeLeft / ROUND_TIME) * 400);
      player.score += 100 + timeBonus;
      drawer.score += 50;

      this.broadcast('correctGuess', {
        playerId: socketId,
        playerName: player.name,
        ...this.getPublicState(),
      });

      // Check if everyone guessed
      const guesserCount = this.players.size - 1; // exclude drawer
      if (this.guessedPlayers.size >= guesserCount) {
        this.clearTimer();
        this.endTurn();
      }

      return { correct: true };
    }

    return { correct: false, guess: normalized };
  }

  startTimer() {
    this.clearTimer();
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.broadcast('timerUpdate', { timeLeft: this.timeLeft });

      // Reveal a letter at halfway
      if (this.timeLeft === Math.floor(ROUND_TIME / 2) && this.currentWord) {
        const hint = this.getPartialHint(1);
        this.broadcastExcept(this.getCurrentDrawerId(), 'hintUpdate', { hint });
      }

      if (this.timeLeft <= 0) {
        this.clearTimer();
        this.endTurn();
      }
    }, 1000);
  }

  getPartialHint(revealCount) {
    const chars = this.currentWord.split('');
    const letterIndices = chars
      .map((c, i) => (/[a-zA-Z]/.test(c) ? i : -1))
      .filter(i => i !== -1);
    const shuffled = letterIndices.sort(() => Math.random() - 0.5);
    const toReveal = new Set(shuffled.slice(0, revealCount));

    return chars.map((c, i) => (toReveal.has(i) || !/[a-zA-Z]/.test(c) ? c : '_')).join('');
  }

  endTurn() {
    this.state = 'roundEnd';
    this.broadcast('turnEnd', {
      word: this.currentWord,
      ...this.getPublicState(),
    });

    setTimeout(() => {
      if (this.state === 'roundEnd') {
        this.nextTurn();
      }
    }, 3000);
  }

  endGame(reason) {
    this.clearTimer();
    this.state = 'gameOver';
    const scores = [...this.players.entries()]
      .map(([id, p]) => ({ id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);

    this.broadcast('gameOver', { scores, reason });
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getPublicState() {
    const scores = [...this.players.entries()].map(([id, p]) => ({
      id,
      name: p.name,
      score: p.score,
    }));

    return {
      state: this.state,
      round: this.round,
      maxRounds: MAX_ROUNDS,
      timeLeft: this.timeLeft,
      drawer: this.getCurrentDrawerId(),
      drawerName: this.players.get(this.getCurrentDrawerId())?.name,
      scores,
      playerCount: this.players.size,
    };
  }

  broadcast(event, data) {
    this.io.to(this.roomId).emit(event, data);
  }

  broadcastExcept(socketId, event, data) {
    const players = this.getPlayerOrder();
    for (const id of players) {
      if (id !== socketId) {
        this.io.to(id).emit(event, data);
      }
    }
  }
}
