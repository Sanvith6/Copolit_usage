import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import './ChatApp.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const updateParticipantStatus = (participant, userId, status) => {
  if (!participant) return participant;
  const participantId = participant._id || participant.id;
  if (participantId !== userId) return participant;
  return { ...participant, status };
};

const updateParticipants = (participants, userId, status) =>
  participants.map(participant => updateParticipantStatus(participant, userId, status));

export default function ChatApp({ user, token, onLogout, onUpdateUser }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const socketRef = useRef(null);

  const applyStatusUpdate = useCallback((userId, status) => {
    if (!userId) return;
    setChats(prev => prev.map(chat => ({
      ...chat,
      participants: updateParticipants(chat.participants, userId, status)
    })));
    setSelectedChat(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: updateParticipants(prev.participants, userId, status)
      };
    });
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.emit('join', user.id);

    socket.on('online_users', (users) => setOnlineUsers(users));

    socket.on('status_updated', ({ userId, status }) => {
      applyStatusUpdate(userId, status);
    });

    socket.on('receive_message', (message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      setChats(prev => prev.map(c =>
        c._id === message.chat ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    });

    socket.on('typing', ({ senderId }) => {
      setTypingUsers(prev => ({ ...prev, [senderId]: true }));
    });

    socket.on('stop_typing', ({ senderId }) => {
      setTypingUsers(prev => { const n = {...prev}; delete n[senderId]; return n; });
    });

    return () => socket.disconnect();
  }, [user.id, applyStatusUpdate]);

  useEffect(() => {
    fetchChats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API}/chats`, { headers: { Authorization: `Bearer ${token}` } });
      setChats(res.data);
    } catch (err) { console.error(err); }
  };

  const selectChat = async (chat) => {
    setSelectedChat(chat);
    try {
      const res = await axios.get(`${API}/messages/${chat._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data);
    } catch (err) { console.error(err); }
  };

  const startChat = async (userId) => {
    try {
      const res = await axios.post(`${API}/chats`, { recipientId: userId }, { headers: { Authorization: `Bearer ${token}` } });
      const chat = res.data;
      setChats(prev => {
        if (prev.some(c => c._id === chat._id)) return prev;
        return [chat, ...prev];
      });
      selectChat(chat);
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (content) => {
    if (!selectedChat || !content.trim()) return;
    try {
      const res = await axios.post(`${API}/messages`, { chatId: selectedChat._id, content }, { headers: { Authorization: `Bearer ${token}` } });
      const message = res.data;
      setMessages(prev => [...prev, message]);
      setChats(prev => prev.map(c =>
        c._id === selectedChat._id ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));

      const otherParticipant = selectedChat.participants.find(p => p._id !== user.id);
      if (otherParticipant) {
        socketRef.current.emit('send_message', { recipientId: otherParticipant._id, message });
      }
    } catch (err) { console.error(err); }
  };

  const emitTyping = (isTyping) => {
    if (!selectedChat) return;
    const other = selectedChat.participants.find(p => p._id !== user.id);
    if (!other) return;
    socketRef.current.emit(isTyping ? 'typing' : 'stop_typing', { recipientId: other._id, senderId: user.id });
  };

  const getOtherParticipant = (chat) => chat.participants.find(p => p._id !== user.id);

  const handleStatusUpdated = (updatedUser) => {
    if (!updatedUser) return;
    onUpdateUser?.(updatedUser);
    const updatedId = updatedUser.id || updatedUser._id;
    if (socketRef.current && updatedId) {
      socketRef.current.emit('update_status', { userId: updatedId, status: updatedUser.status });
    }
    applyStatusUpdate(updatedId, updatedUser.status);
  };

  return (
    <div className="chat-app">
      <Sidebar
        user={user}
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={selectChat}
        onStartChat={startChat}
        onLogout={onLogout}
        token={token}
        onlineUsers={onlineUsers}
        getOtherParticipant={getOtherParticipant}
        onStatusUpdated={handleStatusUpdated}
      />
      <ChatWindow
        user={user}
        chat={selectedChat}
        messages={messages}
        onSend={sendMessage}
        onTyping={emitTyping}
        typingUsers={typingUsers}
        onlineUsers={onlineUsers}
        getOtherParticipant={getOtherParticipant}
      />
    </div>
  );
}
