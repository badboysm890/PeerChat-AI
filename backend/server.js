// server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
require('dotenv').config();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const allowedOrigins = ['http://peerai.aiforindia.com', 'https://peerai.aiforindia.com'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));

let users = {}; // Tracks users: { socket.id: { capable: boolean, load: number, helped: number } }
let onlineUsersCount = 0;

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Initialize user info with load as 0
  users[socket.id] = { capable: false, load: 0, helped: 0 };

  // Handle user joining
  socket.on('join', (data) => {
    users[socket.id].capable = data.capable;
    onlineUsersCount = Object.keys(users).length;
    console.log(`User joined: ${socket.id}, Capable: ${data.capable}`);
    // Emit updated online users count to all clients
    io.emit('onlineUsersCount', onlineUsersCount);
    io.emit('usersUpdate', users); // Notify all users of the updated user list
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete users[socket.id];
    onlineUsersCount = Object.keys(users).length;
    // Emit updated online users count to all clients
    io.emit('onlineUsersCount', onlineUsersCount);
    io.emit('usersUpdate', users); // Notify all users of the updated user list
  });

  // Handle computation request
  socket.on('requestComputation', () => {
    // Find capable users (excluding the requester)
    const capableUsers = Object.entries(users)
      .filter(([id, info]) => info.capable && id !== socket.id)
      .map(([id, info]) => ({ id, load: info.load }));

    if (capableUsers.length > 0) {
      // Select the capable user with the least load
      const { id: peerId } = capableUsers.reduce((prev, curr) =>
        prev.load <= curr.load ? prev : curr
      );

      // Increment load for the selected user
      users[peerId].load += 1;
      io.to(socket.id).emit('peerId', { peerId });

      // Emit updated user list to all clients
      io.emit('usersUpdate', users);
    } else {
      socket.emit('peerId', { peerId: null }); // No capable users available
    }
  });

  // Handle WebRTC signaling: offer
  socket.on('offer', (data) => {
    const { to, offer } = data;
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  // Handle WebRTC signaling: answer
  socket.on('answer', (data) => {
    const { to, answer } = data;
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  // Handle computation completion to potentially track help counts
  socket.on('computationCompleted', (data) => {
    const { helperId } = data;
    console.log(`Computation completed by helper: ${helperId}`);

    // Decrement load for the helper user
    if (users[helperId]) {
      users[helperId].load = Math.max(0, users[helperId].load - 1); // Ensure load doesn't go below 0
      users[helperId].helped += 1; // Increment the number of times this user helped
      io.emit('usersUpdate', users); // Notify all users of the updated user list
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});