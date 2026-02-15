import {Server} from "socket.io"

const io = new Server(4000, {
  cors: {
    origin: ['https://multiplayer-drawing-sp3y.onrender.com/'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Listen for custom "event" from THIS specific socket
  socket.on('event', (string,room) =>{

    for (let i = 0; i < room.length; i++) {
        console.log(`Emitting to room: ${room[i]}`);
        socket.to(room).emit("receive", string);
    }

  });
  socket.on('clear', (room) =>{
    for (let i = 0; i < room.length; i++) {
        console.log(`Emitting clear to room: ${room[i]}`);
        socket.to(room).emit("clear");
    }})
  socket.on('joinRoom', (roomId) => {
        socket.to(roomId).emit("joinner", socket.id);

  })
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

console.log('Socket.IO server running on port 4000');