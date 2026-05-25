import { useState, useRef, useEffect } from 'react';

export default function Chat({ socket, messages, isDrawer, hasGuessed }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendGuess = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit('guess', input.trim());
    setInput('');
  };

  const canGuess = !isDrawer && !hasGuessed;

  return (
    <div className="chat">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type || ''}`}>
            {msg.type === 'correct' ? (
              <span className="correct-msg">{msg.playerName} guessed the word!</span>
            ) : msg.type === 'system' ? (
              <span className="system-msg">{msg.message}</span>
            ) : (
              <>
                <strong>{msg.playerName}: </strong>
                <span>{msg.message}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendGuess} className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isDrawer ? "You're drawing!" : hasGuessed ? 'You guessed it!' : 'Type your guess...'
          }
          disabled={!canGuess}
          maxLength={50}
        />
        <button type="submit" disabled={!canGuess}>
          Send
        </button>
      </form>
    </div>
  );
}
