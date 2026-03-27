const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const { authenticateSocket } = require('./middleware/auth');

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Init DB
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

// Socket.io
const onlineUsers = new Map(); // userId -> socketId

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const userId = socket.user.id;
  onlineUsers.set(userId, socket.id);
  io.emit('user:online', { userId, online: true });

  socket.on('message:send', ({ conversationId, content }) => {
    const { getConversation, createMessage, getMessages } = require('./db');
    const conv = getConversation(conversationId);
    if (!conv) return;
    const participants = JSON.parse(conv.participants);
    if (!participants.includes(userId)) return;

    const msg = createMessage({ conversationId, senderId: userId, content });
    // Deliver to all participants online
    participants.forEach(pid => {
      const sid = onlineUsers.get(pid);
      if (sid) {
        io.to(sid).emit('message:new', msg);
      }
    });
  });

  socket.on('typing:start', ({ conversationId }) => {
    const { getConversation } = require('./db');
    const conv = getConversation(conversationId);
    if (!conv) return;
    const participants = JSON.parse(conv.participants);
    participants.forEach(pid => {
      if (pid !== userId) {
        const sid = onlineUsers.get(pid);
        if (sid) io.to(sid).emit('typing:start', { conversationId, userId });
      }
    });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    const { getConversation } = require('./db');
    const conv = getConversation(conversationId);
    if (!conv) return;
    const participants = JSON.parse(conv.participants);
    participants.forEach(pid => {
      if (pid !== userId) {
        const sid = onlineUsers.get(pid);
        if (sid) io.to(sid).emit('typing:stop', { conversationId, userId });
      }
    });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('user:online', { userId, online: false });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
