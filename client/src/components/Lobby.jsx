import { useState } from 'react';

export default function Lobby({ socket, onJoinGame }) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  const createRoom = () => {
    if (!name.trim()) return setError('Enter your name');
    socket.emit('createRoom', name.trim(), (res) => {
      if (res.error) return setError(res.error);
      onJoinGame(res.roomId, res.playerId);
    });
  };

  const joinRoom = () => {
    if (!name.trim()) return setError('Enter your name');
    if (!roomId.trim()) return setError('Enter room code');
    socket.emit('joinRoom', roomId.trim().toUpperCase(), name.trim(), (res) => {
      if (res.error) return setError(res.error);
      onJoinGame(res.roomId, res.playerId);
    });
  };

  return (
    <div className="lobby">
      <h1>SketchAlong</h1>
      <p className="subtitle">Draw, guess, and have fun!</p>

      <div className="lobby-form">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
        />

        <button className="btn primary" onClick={createRoom}>
          Create Room
        </button>

        <div className="divider">or join existing room</div>

        <input
          type="text"
          placeholder="Room code"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          maxLength={6}
        />

        <button className="btn secondary" onClick={joinRoom}>
          Join Room
        </button>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
