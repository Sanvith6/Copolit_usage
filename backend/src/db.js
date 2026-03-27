const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/chat.db');
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

function getDB() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function initDB() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#25D366',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      participants TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
  `);
}

function createUser({ username, displayName, passwordHash }) {
  const db = getDB();
  const colors = ['#25D366','#128C7E','#075E54','#34B7F1','#ECE5DD'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const user = {
    id: uuidv4(),
    username,
    display_name: displayName,
    password_hash: passwordHash,
    avatar_color: color,
    created_at: Date.now()
  };
  db.prepare(`INSERT INTO users (id, username, display_name, password_hash, avatar_color, created_at) VALUES (?,?,?,?,?,?)`)
    .run(user.id, user.username, user.display_name, user.password_hash, user.avatar_color, user.created_at);
  return user;
}

function getUserByUsername(username) {
  return getDB().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return getDB().prepare('SELECT id, username, display_name, avatar_color, created_at FROM users WHERE id = ?').get(id);
}

function getAllUsers() {
  return getDB().prepare('SELECT id, username, display_name, avatar_color FROM users').all();
}

function getOrCreateConversation(userAId, userBId) {
  const db = getDB();
  const sorted = [userAId, userBId].sort();
  const existing = db.prepare(`SELECT * FROM conversations WHERE participants = ?`).get(JSON.stringify(sorted));
  if (existing) return existing;
  const conv = { id: uuidv4(), participants: JSON.stringify(sorted), created_at: Date.now() };
  db.prepare(`INSERT INTO conversations (id, participants, created_at) VALUES (?,?,?)`).run(conv.id, conv.participants, conv.created_at);
  return conv;
}

function getConversation(id) {
  return getDB().prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

function getUserConversations(userId) {
  const db = getDB();
  const convs = db.prepare(`SELECT * FROM conversations WHERE participants LIKE ?`).all(`%${userId}%`);
  return convs.filter(c => JSON.parse(c.participants).includes(userId));
}

function createMessage({ conversationId, senderId, content }) {
  const db = getDB();
  const msg = { id: uuidv4(), conversation_id: conversationId, sender_id: senderId, content, created_at: Date.now() };
  db.prepare(`INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?,?,?,?,?)`).run(
    msg.id, msg.conversation_id, msg.sender_id, msg.content, msg.created_at
  );
  return msg;
}

function getMessages(conversationId, limit = 50) {
  return getDB().prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?').all(conversationId, limit);
}

module.exports = { initDB, createUser, getUserByUsername, getUserById, getAllUsers, getOrCreateConversation, getConversation, getUserConversations, createMessage, getMessages };
