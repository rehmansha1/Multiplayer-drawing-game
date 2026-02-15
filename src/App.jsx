import React, { useState, useRef, useEffect } from 'react';
import { Paintbrush, Eraser, Trash2, Users, Download, Copy, Check, LogIn, Home } from 'lucide-react';
import { io } from 'socket.io-client';

export default function App() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('brush');
  const [users, setUsers] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputUsername, setInputUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const [drawingQueue, setDrawingQueue] = useState([]);
  const [socketId,setSocketId] = useState("");
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];
  const [players, setPlayers] = useState([]);
  // Real-time sync using storage as WebSocket alternative
  useEffect(() => {
    if (!isInRoom) return;

    const interval = setInterval(async () => {
      await syncRoom();
    }, 500);

    return () => clearInterval(interval);
  }, [isInRoom, roomId]);

  // Keep user presence alive
  useEffect(() => {
    if (!isInRoom) return;

    const interval = setInterval(async () => {
      await updatePresence();
    }, 3000);

    return () => clearInterval(interval);
  }, [isInRoom, roomId, username]);

  const syncRoom = async (data) => {
    try {
      if (data) {
        
        // Update canvas if there are new strokes
        if (data.points && data.points.length > 0) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          // Redraw all strokes


            ctx.beginPath();
            
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.size;
            ctx.lineCap = 'round';
            data.points.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.stroke();
        
        }
        
        // Update users list
        const now = Date.now();
        const activeUsers = (data.users || []).filter(u => now - u.lastActive < 10000);
        setUsers(activeUsers);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const updatePresence = async () => {
    try {
      const result = await window.storage.get(`room-${roomId}`, true);
      let data = result ? JSON.parse(result.value) : { strokes: [], users: [] };
      
      const now = Date.now();
      data.users = (data.users || []).filter(u => now - u.lastActive < 10000 && u.id !== userId);
      data.users.push({
        id: userId,
        name: username,
        lastActive: now
      });
      
      await window.storage.set(`room-${roomId}`, JSON.stringify(data), true);
    } catch (error) {
      console.error('Presence error:', error);
    }
  };
  const socketRef = useRef(null);
  const [received, setReceived] = useState([]);

  useEffect(() => {
    // Create a single socket connection on mount
    socketRef.current = io('https://multiplayer-drawing-game-server.onrender.com', {
      // withCredentials: true, // enable if your server needs cookies
      transports: ['websocket'], // optional: reduce polling in dev
      // autoConnect: true, // default true
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected:', socket.id);
      setSocketId(socket.id)
      console.log(players);
    });

    socket.on('receive', (payload) => {
      console.log('receive:', payload);
      setReceived((prev) => [...prev, payload]);
      syncRoom(payload)
    });
    socket.on('joinner', (roomId) => {
      console.log(`Joined room: ${roomId}`);
      setPlayers((prev) => [...prev, roomId]);

    });
    socket.on('clear', () => {
      console.log('Canvas cleared by another user');
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    socket.on('disconnect', (reason) => {
      console.warn('disconnected:', reason);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.off('receive');
        socket.disconnect();
      }
    };
  }, []);
  const broadcastStroke = async (stroke) => {
console.log(players);
      socketRef.current.emit('event', stroke,players);
    

  };

  const createRoom = () => {
    
    setRoomId(socketId);
    setUsername(inputUsername || 'Anonymous');
    setIsInRoom(true);
    initializeCanvas();
  };

  const joinRoom = async () => {
          setPlayers((prev) => [...prev, inputRoomId])

    socketRef.current.emit('joinRoom', inputRoomId);
    if (!inputRoomId.trim()) return;
    setRoomId(inputRoomId.toUpperCase());
    setUsername(inputUsername || 'Anonymous');
    setIsInRoom(true);
    initializeCanvas();
  };

  const leaveRoom = () => {
    setIsInRoom(false);
    setRoomId('');
    setUsers([]);
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };


const startDrawing = (e) => {
  e.preventDefault(); // Prevent scrolling on touch
  const { x, y } = getCoordinates(e);
  
  setIsDrawing(true);
  setDrawingQueue([{ x, y }]);
  
  const ctx = canvasRef.current.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(x, y);
};
const getCoordinates = (e) => {
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  
  // Check if it's a touch event or mouse event
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  
  return { x, y };
};
const draw = (e) => {
  if (!isDrawing) return;
  e.preventDefault(); // Prevent scrolling on touch
  
  const { x, y } = getCoordinates(e);
  setDrawingQueue(prev => [...prev, { x, y }]);
  
  const ctx = canvasRef.current.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
  
  ctx.lineTo(x, y);
  ctx.stroke();
};
  const stopDrawing = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (drawingQueue.length > 0) {
      const stroke = {
        points: drawingQueue,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        size: brushSize,
        userId: userId,
        timestamp: Date.now()
      };
      
      await broadcastStroke(stroke);
      console.log(drawingQueue);
      setDrawingQueue([]);
    }
  };
  
  const clearCanvas = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const stoke = {
      points: [],
      color: '#FFFFFF',
      size: 0,
      userId: userId,
      clear : true
    }
    try {
      socketRef.current.emit('clear', players);
    } catch (error) {
      console.error('Clear error:', error);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `drawing-${roomId}.png`;
    link.href = url;
    link.click();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Landing page
  if (!isInRoom) {
    return (
      <div style={{
        minHeight: '100vh',
              minWidth: '100vw',

        background: 'linear-gradient(to bottom right, #9333ea, #2563eb, #06b6d4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '2rem',
          maxWidth: '28rem',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-block',
              padding: '1rem',
              background: 'linear-gradient(to bottom right, #a855f7, #3b82f6)',
              borderRadius: '1rem',
              marginBottom: '1rem'
            }}>
              <Paintbrush size={48} color="white" />
            </div>
            <h1 style={{
              fontSize: '2.25rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>Drawing Rooms</h1>
            <p style={{ color: '#4b5563' }}>Create or join a private drawing room</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>Your Name</label>
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder="Enter your name"
                style={{
                  minWidth: '97%',
                  padding: '10px',
                  paddingRight:'0px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '1px',
                background: '#d1d5db'
              }}></div>
              <div style={{
                position: 'relative',
                textAlign: 'center'
              }}>
                <span style={{
                  padding: '0 1rem',
                  background: 'white',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>Choose an option</span>
              </div>
            </div>

            <button
              onClick={createRoom}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(to right, #9333ea, #2563eb)',
                color: 'white',
                borderRadius: '0.75rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              <Home size={20} />
              Create New Room
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                placeholder="Enter room code"
                style={{
                  minWidth: '80%',
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  outline: 'none',
                  textTransform: 'uppercase'
                }}
                onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <button
                onClick={joinRoom}
                disabled={!inputRoomId.trim()}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: inputRoomId.trim() ? 'linear-gradient(to right, #0891b2, #2563eb)' : '#9ca3af',
                  color: 'white',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: inputRoomId.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '1rem',
                  transition: 'transform 0.2s',
                  opacity: inputRoomId.trim() ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (inputRoomId.trim()) e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                <LogIn size={20} />
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Drawing room
  return (
    <div style={{
      minHeight: '100vh',
            minWidth: '100vw',

      background: 'linear-gradient(to bottom right, #faf5ff, #eff6ff)',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '112rem', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(to right, #9333ea, #2563eb)',
            color: 'white',
            padding: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>Drawing Room</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <code style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '0.25rem 1rem',
                    borderRadius: '9999px',
                    fontFamily: 'monospace',
                    fontSize: '1.125rem'
                  }}>
                    {roomId}
                  </code>
                  <button
                    onClick={copyRoomId}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '0.5rem',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'white'
                    }}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Users size={20} />
                  <span style={{ fontWeight: '600' }}>{users.length} online</span>
                </div>
                <button
                  onClick={leaveRoom}
                  style={{
                    background: '#ef4444',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>

          {/* User list */}
          <div style={{
            background: '#faf5ff',
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#4b5563' }}>Users:</span>
              {users.map((user) => (
                <span
                  key={user.id}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    background: user.id === userId ? '#9333ea' : 'white',
                    color: user.id === userId ? 'white' : '#374151'
                  }}
                >
                  {user.name} {user.id === userId && '(you)'}
                </span>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div style={{
            background: '#f9fafb',
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setTool('brush')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: tool === 'brush' ? '#9333ea' : 'white',
                  color: tool === 'brush' ? 'white' : '#374151',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Paintbrush size={20} />
              </button>
              <button
                onClick={() => setTool('eraser')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: tool === 'eraser' ? '#9333ea' : 'white',
                  color: tool === 'eraser' ? 'white' : '#374151',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Eraser size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    border: color === c ? '4px solid #9333ea' : 'none',
                    cursor: 'pointer',
                    backgroundColor: c,
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.2s'
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                style={{ width: '8rem' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', width: '2rem' }}>{brushSize}</span>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={downloadImage}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#16a34a',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Download size={18} />
                Save
              </button>
              <button
                onClick={clearCanvas}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#dc2626',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Trash2 size={18} />
                Clear
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div style={{ padding: '2rem', background: '#f3f4f6' }}>
            <div style={{
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
            }}>
        <canvas
  ref={canvasRef}
  width={1200}
  height={700}
  onMouseDown={startDrawing}
  onMouseMove={draw}
  onMouseUp={stopDrawing}
  onMouseLeave={stopDrawing}
  onTouchStart={startDrawing}
  onTouchMove={draw}
  onTouchEnd={stopDrawing}
  onTouchCancel={stopDrawing}
  style={{
    width: '100%',
    cursor: 'crosshair',
    borderRadius: '0.5rem',
    display: 'block',
    touchAction: 'none' // Add this to prevent default touch behaviors
  }}
/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}