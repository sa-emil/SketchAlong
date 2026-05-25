import { useRef, useEffect, useState, useCallback } from 'react';

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#FF8C00', '#FFD700', '#00C853',
  '#2196F3', '#9C27B0', '#795548', '#607D8B', '#FF69B4', '#00BCD4',
];

const SIZES = [3, 6, 12, 20];

export default function Canvas({ socket, isDrawer }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(6);
  const lastPos = useRef(null);

  const drawLine = useCallback((x1, y1, x2, y2, strokeColor, strokeSize) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

  useEffect(() => {
    if (!socket) return;

    const handleDraw = (data) => {
      drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.size);
    };

    const handleClear = () => clearCanvas();

    const handleHistory = (history) => {
      clearCanvas();
      history.forEach(handleDraw);
    };

    socket.on('draw', handleDraw);
    socket.on('clearCanvas', handleClear);
    socket.on('drawHistory', handleHistory);

    return () => {
      socket.off('draw', handleDraw);
      socket.off('clearCanvas', handleClear);
      socket.off('drawHistory', handleHistory);
    };
  }, [socket, drawLine, clearCanvas]);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getCanvasPos(e);
  };

  const doDraw = (e) => {
    if (!isDrawer || !drawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const prev = lastPos.current;

    drawLine(prev.x, prev.y, pos.x, pos.y, color, size);
    socket.emit('draw', {
      x1: prev.x, y1: prev.y,
      x2: pos.x, y2: pos.y,
      color, size,
    });

    lastPos.current = pos;
  };

  const stopDraw = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const handleClear = () => {
    clearCanvas();
    socket.emit('clearCanvas');
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={`drawing-canvas ${isDrawer ? 'drawer' : 'viewer'}`}
        onMouseDown={startDraw}
        onMouseMove={doDraw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={doDraw}
        onTouchEnd={stopDraw}
      />
      {isDrawer && (
        <div className="toolbar">
          <div className="color-picker">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-btn ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="size-picker">
            {SIZES.map((s) => (
              <button
                key={s}
                className={`size-btn ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >
                <span className="size-dot" style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
          <button className="clear-btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
