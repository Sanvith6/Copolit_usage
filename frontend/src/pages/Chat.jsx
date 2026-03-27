import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { getSocket, disconnectSocket } from '../socket'

function Avatar({ name, color, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const sz = size === 'sm' ? 'w-9 h-9 text-sm' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base'
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`} style={{ backgroundColor: color || '#25D366' }}>
      {initials}
    </div>
  )
}

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Chat() {
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const token = localStorage.getItem('token')

  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [inputMsg, setInputMsg] = useState('')
  const [typingUsers, setTypingUsers] = useState({})
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const messagesEndRef = useRef(null)
  const typingTimerRef = useRef(null)
  const socket = getSocket(token)

  const loadConversations = useCallback(async () => {
    const { data } = await api.get('/conversations')
    setConversations(data)
  }, [])

  useEffect(() => {
    loadConversations()
    api.get('/users').then(({ data }) => setUsers(data))
  }, [loadConversations])

  useEffect(() => {
    socket.on('message:new', msg => {
      if (activeConv && msg.conversation_id === activeConv.id) {
        setMessages(prev => [...prev, msg])
      }
      loadConversations()
    })
    socket.on('typing:start', ({ conversationId, userId }) => {
      if (activeConv?.id === conversationId) {
        setTypingUsers(prev => ({ ...prev, [userId]: true }))
      }
    })
    socket.on('typing:stop', ({ conversationId, userId }) => {
      setTypingUsers(prev => { const n = { ...prev }; delete n[userId]; return n })
    })
    socket.on('user:online', ({ userId, online }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        online ? next.add(userId) : next.delete(userId)
        return next
      })
    })
    return () => {
      socket.off('message:new')
      socket.off('typing:start')
      socket.off('typing:stop')
      socket.off('user:online')
    }
  }, [activeConv, socket, loadConversations])

  useEffect(() => {
    if (activeConv) {
      api.get(`/messages/${activeConv.id}`).then(({ data }) => setMessages(data))
    }
  }, [activeConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openConversation = conv => {
    setActiveConv(conv)
    setShowNewChat(false)
    setTypingUsers({})
  }

  const startChat = async user => {
    const { data } = await api.post('/conversations', { userId: user.id })
    setConversations(prev => {
      if (prev.find(c => c.id === data.id)) return prev
      return [data, ...prev]
    })
    setActiveConv(data)
    setShowNewChat(false)
    setSearchUser('')
  }

  const sendMessage = e => {
    e.preventDefault()
    if (!inputMsg.trim() || !activeConv) return
    socket.emit('message:send', { conversationId: activeConv.id, content: inputMsg.trim() })
    setInputMsg('')
    clearTimeout(typingTimerRef.current)
    socket.emit('typing:stop', { conversationId: activeConv.id })
  }

  const handleTyping = e => {
    setInputMsg(e.target.value)
    if (!activeConv) return
    socket.emit('typing:start', { conversationId: activeConv.id })
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConv.id })
    }, 2000)
  }

  const logout = () => {
    localStorage.clear()
    disconnectSocket()
    navigate('/login')
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.display_name.toLowerCase().includes(searchUser.toLowerCase())
  )

  const isTyping = Object.keys(typingUsers).length > 0

  return (
    <div className="flex h-screen bg-wa-dark overflow-hidden">
      {/* Sidebar */}
      <div className="w-[360px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-wa-panel">
          <Avatar name={currentUser.display_name} color={currentUser.avatar_color} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewChat(v => !v)}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              title="New chat"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-600 fill-current">
                <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"/>
              </svg>
            </button>
            <button onClick={logout} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Logout">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-600 fill-current">
                <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Search / New Chat */}
        {showNewChat ? (
          <div className="flex flex-col flex-1">
            <div className="px-3 py-2 bg-wa-panel">
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-gray-200">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 fill-current flex-shrink-0">
                  <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.185 5.185 0 0 0 3.386-1.256l.221.22v.635l4.004 3.999 1.194-1.195-3.998-4.006zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"/>
                </svg>
                <input
                  className="flex-1 outline-none text-sm"
                  placeholder="Search users…"
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => startChat(u)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-wa-panel transition-colors border-b border-gray-100"
                >
                  <Avatar name={u.display_name} color={u.avatar_color} />
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">{u.display_name}</p>
                    <p className="text-xs text-gray-500">@{u.username}</p>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No users found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-3 py-2 bg-wa-panel">
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-gray-200">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 fill-current flex-shrink-0">
                  <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.185 5.185 0 0 0 3.386-1.256l.221.22v.635l4.004 3.999 1.194-1.195-3.998-4.006zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"/>
                </svg>
                <input className="flex-1 outline-none text-sm" placeholder="Search or start new chat" readOnly />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Click the chat icon to start one</p>
                </div>
              )}
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-wa-panel border-b border-gray-100 transition-colors ${activeConv?.id === conv.id ? 'bg-wa-panel' : ''}`}
                >
                  <div className="relative">
                    <Avatar name={conv.other?.display_name} color={conv.other?.avatar_color} />
                    {onlineUsers.has(conv.other?.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-wa-green border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm truncate">{conv.other?.display_name}</p>
                    </div>
                    <p className="text-xs text-gray-500 truncate">@{conv.other?.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-wa-panel border-b border-gray-200">
              <div className="relative">
                <Avatar name={activeConv.other?.display_name} color={activeConv.other?.avatar_color} />
                {onlineUsers.has(activeConv.other?.id) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-wa-green border-2 border-white rounded-full" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{activeConv.other?.display_name}</p>
                <p className="text-xs text-gray-500">
                  {isTyping ? <span className="text-wa-teal">typing…</span> : onlineUsers.has(activeConv.other?.id) ? 'online' : `@${activeConv.other?.username}`}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1c4b0' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", backgroundColor: '#E5DDD5' }}
            >
              <div className="flex flex-col gap-1">
                {messages.map((msg, idx) => {
                  const isMine = msg.sender_id === currentUser.id
                  const prevMsg = messages[idx - 1]
                  const showTime = !prevMsg || msg.created_at - prevMsg.created_at > 5 * 60 * 1000
                  return (
                    <React.Fragment key={msg.id}>
                      {showTime && (
                        <div className="flex justify-center my-2">
                          <span className="bg-white/70 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm text-sm ${
                            isMine ? 'bg-wa-light text-gray-800 rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'
                          }`}
                        >
                          <p className="break-words">{msg.content}</p>
                          <p className="text-right text-xs text-gray-400 mt-1">{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg rounded-bl-none px-4 py-3 shadow-sm flex gap-1 items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3 bg-wa-panel border-t border-gray-200">
              <div className="flex-1 bg-white rounded-full px-5 py-2.5 border border-gray-200 flex items-center">
                <input
                  className="flex-1 outline-none text-sm"
                  placeholder="Type a message"
                  value={inputMsg}
                  onChange={handleTyping}
                />
              </div>
              <button
                type="submit"
                disabled={!inputMsg.trim()}
                className="w-11 h-11 bg-wa-green hover:bg-wa-teal rounded-full flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                  <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-wa-panel">
            <div className="w-64 h-64 bg-wa-green/10 rounded-full flex items-center justify-center mb-6">
              <svg viewBox="0 0 24 24" className="w-32 h-32 text-wa-green fill-current opacity-40">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-light text-gray-700 mb-2">WhatsApp Web Clone</h2>
            <p className="text-gray-500 text-sm">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
