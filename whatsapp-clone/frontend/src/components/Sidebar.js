import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatusModal from './StatusModal';
import './Sidebar.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Sidebar({ user, chats, selectedChat, onSelectChat, onStartChat, onLogout, token, onlineUsers, getOtherParticipant, onStatusUpdated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    axios.get(`${API}/auth/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setAllUsers(res.data))
      .catch(console.error);
  }, [token]);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchResults(allUsers.filter(u =>
      u.username.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase())
    ));
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const getAvatar = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="user-avatar">{getAvatar(user.username)}</div>
        <span className="header-title">WhatsApp</span>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setShowSearch(!showSearch)} title="New chat">🔍</button>
          <button className="icon-btn" onClick={onLogout} title="Logout">⏏</button>
        </div>
      </div>
      <div className="sidebar-status">
        <div className="status-text">
          <span className="status-label">Status</span>
          <span className="status-value">{user.status || 'Hey there! I am using WhatsApp.'}</span>
        </div>
        <button className="icon-btn status-edit-btn" onClick={() => setShowStatusModal(true)} title="Edit status">✏️</button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder={showSearch ? "Search users to start a chat..." : "Search or start new chat"}
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => setShowSearch(true)}
        />
      </div>

      {/* Search Results */}
      {showSearch && searchQuery && (
        <div className="search-results">
          {searchResults.length === 0 ? (
            <div className="no-results">No users found</div>
          ) : (
            searchResults.map(u => (
              <div key={u._id} className="search-result-item" onClick={() => {
                onStartChat(u._id);
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <div className="result-avatar">{getAvatar(u.username)}</div>
                <div className="result-info">
                  <span className="result-name">{u.username}</span>
                  <span className="result-email">{u.email}</span>
                </div>
                {onlineUsers.includes(u._id) && <div className="online-dot" />}
              </div>
            ))
          )}
        </div>
      )}

      {/* Chat List */}
      <div className="chat-list">
        {chats.length === 0 && !showSearch ? (
          <div className="empty-chats">
            <p>No conversations yet</p>
            <p>Search for a user to start chatting</p>
          </div>
        ) : (
          chats.map(chat => {
            const other = getOtherParticipant(chat);
            if (!other) return null;
            return (
              <div key={chat._id}
                className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                onClick={() => { onSelectChat(chat); setShowSearch(false); }}
              >
                <div className="chat-avatar-wrap">
                  <div className="chat-avatar">{getAvatar(other.username)}</div>
                  {onlineUsers.includes(other._id) && <div className="online-badge" />}
                </div>
                <div className="chat-info">
                  <div className="chat-name-row">
                    <span className="chat-name">{other.username}</span>
                    <span className="chat-time">{formatTime(chat.updatedAt)}</span>
                  </div>
                  <div className="chat-preview">
                    {chat.lastMessage ? (
                      <span>{chat.lastMessage.sender?._id === user.id ? 'You: ' : ''}{chat.lastMessage.content}</span>
                    ) : (
                      <span className="no-msg">No messages yet</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {showStatusModal && (
        <StatusModal
          user={user}
          token={token}
          onClose={() => setShowStatusModal(false)}
          onStatusUpdated={(updatedUser) => {
            onStatusUpdated?.(updatedUser);
            setShowStatusModal(false);
          }}
        />
      )}
    </div>
  );
}
