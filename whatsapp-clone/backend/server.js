require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const messageRoutes = require('./routes/message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// Socket.io
const onlineUsers = {};

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    onlineUsers[userId] = socket.id;
    io.emit('online_users', Object.keys(onlineUsers));
  });

  socket.on('send_message', (data) => {
    const { recipientId, message } = data;
    const recipientSocketId = onlineUsers[recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receive_message', message);
    }
  });

  socket.on('typing', (data) => {
    const recipientSocketId = onlineUsers[data.recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing', { senderId: data.senderId });
    }
  });

  socket.on('stop_typing', (data) => {
    const recipientSocketId = onlineUsers[data.recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('stop_typing', { senderId: data.senderId });
    }
  });

  socket.on('disconnect', () => {
    Object.keys(onlineUsers).forEach(uid => {
      if (onlineUsers[uid] === socket.id) delete onlineUsers[uid];
    });
    io.emit('online_users', Object.keys(onlineUsers));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
