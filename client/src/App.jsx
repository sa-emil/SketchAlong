import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

const SERVER_URL = window.location.origin;

export default function App() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [playerId, setPlayerId] = useState(null);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  const handleJoinGame = (roomId, playerId) => {
    setRoomId(roomId);
    setPlayerId(playerId);
  };

  if (!socket) return <div className="loading">Connecting...</div>;

  if (!roomId) {
    return <Lobby socket={socket} onJoinGame={handleJoinGame} />;
  }

  return <GameRoom socket={socket} roomId={roomId} playerId={playerId} />;
}
