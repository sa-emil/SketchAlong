import { useState, useEffect, useCallback } from 'react';
import Canvas from './Canvas';
import Chat from './Chat';

export default function GameRoom({ socket, roomId, playerId }) {
  const [gameState, setGameState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [wordChoices, setWordChoices] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [hint, setHint] = useState('');
  const [revealedWord, setRevealedWord] = useState(null);
  const [hasGuessed, setHasGuessed] = useState(false);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev.slice(-100), msg]);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('playerJoined', (state) => {
      setGameState(state);
      addMessage({ type: 'system', message: `A player joined (${state.playerCount} players)` });
    });

    socket.on('playerLeft', (state) => {
      setGameState(state);
      addMessage({ type: 'system', message: `A player left (${state.playerCount} players)` });
    });

    socket.on('turnStart', (state) => {
      setGameState(state);
      setCurrentWord(null);
      setHint('');
      setRevealedWord(null);
      setHasGuessed(false);
      addMessage({
        type: 'system',
        message: `${state.drawerName} is choosing a word...`,
      });
    });

    socket.on('wordChoices', (choices) => {
      setWordChoices(choices);
    });

    socket.on('drawingStart', (state) => {
      setGameState(state);
      setWordChoices([]);
      setHint(state.hint);
      addMessage({
        type: 'system',
        message: `${state.drawerName} is drawing! (${state.wordLength} letters)`,
      });
    });

    socket.on('yourWord', (word) => {
      setCurrentWord(word);
    });

    socket.on('timerUpdate', ({ timeLeft }) => {
      setGameState((prev) => (prev ? { ...prev, timeLeft } : prev));
    });

    socket.on('hintUpdate', ({ hint }) => {
      setHint(hint);
    });

    socket.on('chatMessage', (msg) => {
      addMessage(msg);
    });

    socket.on('correctGuess', (data) => {
      setGameState(data);
      addMessage({ type: 'correct', playerName: data.playerName });
      if (data.playerId === playerId) {
        setHasGuessed(true);
      }
    });

    socket.on('turnEnd', (data) => {
      setGameState(data);
      setRevealedWord(data.word);
      addMessage({ type: 'system', message: `The word was: ${data.word}` });
    });

    socket.on('gameOver', ({ scores, reason }) => {
      setGameState((prev) => (prev ? { ...prev, state: 'gameOver' } : prev));
      const winner = scores[0];
      addMessage({
        type: 'system',
        message: reason || `Game over! ${winner.name} wins with ${winner.score} points!`,
      });
    });

    return () => {
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('turnStart');
      socket.off('wordChoices');
      socket.off('drawingStart');
      socket.off('yourWord');
      socket.off('timerUpdate');
      socket.off('hintUpdate');
      socket.off('chatMessage');
      socket.off('correctGuess');
      socket.off('turnEnd');
      socket.off('gameOver');
    };
  }, [socket, playerId, addMessage]);

  const isDrawer = gameState?.drawer === playerId;

  const startGame = () => socket.emit('startGame');
  const pickWord = (word) => socket.emit('pickWord', word);

  return (
    <div className="game-room">
      {/* Header */}
      <div className="game-header">
        <div className="round-info">
          Round {gameState?.round || 1} / {gameState?.maxRounds || 3}
        </div>
        <div className="word-display">
          {gameState?.state === 'drawing' && (
            isDrawer ? (
              <span className="your-word">{currentWord}</span>
            ) : revealedWord ? (
              <span className="revealed-word">{revealedWord}</span>
            ) : (
              <span className="hint">{hint.split('').join(' ')}</span>
            )
          )}
          {gameState?.state === 'roundEnd' && revealedWord && (
            <span className="revealed-word">{revealedWord}</span>
          )}
        </div>
        <div className="timer">
          {gameState?.state === 'drawing' && (
            <span className={gameState.timeLeft <= 10 ? 'timer-low' : ''}>
              {gameState.timeLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Room code */}
      <div className="room-code">Room: {roomId}</div>

      <div className="game-content">
        {/* Scoreboard */}
        <div className="scoreboard">
          <h3>Players</h3>
          {gameState?.scores?.map((p) => (
            <div
              key={p.id}
              className={`player-score ${p.id === gameState.drawer ? 'drawing' : ''} ${p.id === playerId ? 'you' : ''}`}
            >
              <span className="player-name">
                {p.name} {p.id === playerId && '(you)'}
                {p.id === gameState.drawer && ' ✏️'}
              </span>
              <span className="score">{p.score}</span>
            </div>
          ))}
        </div>

        {/* Main area */}
        <div className="main-area">
          {/* Word picking overlay */}
          {gameState?.state === 'picking' && isDrawer && wordChoices.length > 0 && (
            <div className="word-picker-overlay">
              <h3>Choose a word to draw:</h3>
              <div className="word-choices">
                {wordChoices.map((word) => (
                  <button key={word} className="word-choice" onClick={() => pickWord(word)}>
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Waiting overlay */}
          {gameState?.state === 'picking' && !isDrawer && (
            <div className="waiting-overlay">
              <p>{gameState.drawerName} is choosing a word...</p>
            </div>
          )}

          {/* Lobby state */}
          {(!gameState || gameState.state === 'lobby') && (
            <div className="lobby-waiting">
              <h2>Waiting for players...</h2>
              <p>{gameState?.playerCount || 1} player(s) in room</p>
              {gameState?.playerCount >= 2 && (
                <button className="btn primary" onClick={startGame}>
                  Start Game
                </button>
              )}
              {(!gameState || gameState.playerCount < 2) && (
                <p className="hint-text">Need at least 2 players to start</p>
              )}
            </div>
          )}

          {/* Game over */}
          {gameState?.state === 'gameOver' && (
            <div className="game-over">
              <h2>Game Over!</h2>
              <div className="final-scores">
                {gameState.scores
                  ?.sort((a, b) => b.score - a.score)
                  .map((p, i) => (
                    <div key={p.id} className={`final-score rank-${i}`}>
                      <span className="rank">#{i + 1}</span>
                      <span className="name">{p.name}</span>
                      <span className="score">{p.score} pts</span>
                    </div>
                  ))}
              </div>
              <button className="btn primary" onClick={startGame}>
                Play Again
              </button>
            </div>
          )}

          <Canvas socket={socket} isDrawer={isDrawer && gameState?.state === 'drawing'} />
        </div>

        {/* Chat */}
        <Chat
          socket={socket}
          messages={messages}
          isDrawer={isDrawer}
          hasGuessed={hasGuessed}
        />
      </div>
    </div>
  );
}
