# WhatsApp Clone - Full Stack

A full-stack WhatsApp web clone with real-time messaging, built with React, Node.js, Socket.io, and MongoDB.

## Features
- 🔐 User authentication (register/login)
- 💬 Real-time messaging with Socket.io
- 👤 Online presence indicators
- ✍️ Typing indicators
- 📋 Chat list with last message preview
- 🔍 Search users to start new chats
- 📱 WhatsApp-like UI

## Quick Start (Docker)
```bash
cd whatsapp-clone
docker-compose up --build
```
Then open http://localhost:3000

## Manual Setup

### Backend
```bash
cd whatsapp-clone/backend
npm install
# Edit .env with your MongoDB URI
node server.js
```

### Frontend
```bash
cd whatsapp-clone/frontend
npm install
npm start
```

## Tech Stack
- **Frontend**: React.js, Socket.io-client, Axios
- **Backend**: Node.js, Express, Socket.io, Mongoose
- **Database**: MongoDB
- **Auth**: JWT + bcryptjs
