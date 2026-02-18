import { Server } from "socket.io";

const io = new Server(4000, {
  cors: {
    origin: ["https://multiplayer-drawing-sp3y.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("check", (data) => {
    io.in(data)
      .fetchSockets()
      .then((sockets) => {
        io.to(data).emit("returnCheck", sockets.length);
      });
  });
socket.on("leaveRoom", (data) => { 
    socket.leave(data);
    socket.on("check", (data) => {
    io.in(data)
      .fetchSockets()
      .then((sockets) => {
        io.to(data).emit("returnCheck", sockets.length);
      });
  });
}
);
  // Listen for custom "event" from THIS specific socket
  socket.on("event", (string, room) => {
    console.log(
      `Received event from socket ${socket.id} for room ${room}: ${string}`,
    );
    socket.to(room).emit("receive", string);
  });

  socket.on("clear", (room) => {
    socket.to(room).emit("clear");
  });

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId); // fix: actually join the room
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});

console.log("Socket.IO server running on port 4000");