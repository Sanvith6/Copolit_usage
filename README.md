# WhatsApp Clone

A full-stack real-time chat application inspired by WhatsApp Web.

## Tech Stack

### Backend
- Node.js + Express
- Socket.io (real-time messaging)
- better-sqlite3 (SQLite database)
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)

### Frontend
- React 18 + Vite
- Tailwind CSS
- socket.io-client
- axios
- react-router-dom

## Features

- 🔐 User registration & login with JWT auth
- 💬 Real-time 1-on-1 messaging via WebSocket
- ✍️ Typing indicators
- 🟢 Online presence indicators
- 🔍 User search to start new conversations
- 📱 WhatsApp Web-like UI

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+

### Backend
```bash
cd backend
npm install
node src/index.js
```
Server runs on http://localhost:4000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs on http://localhost:3000

## Docker

```bash
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
