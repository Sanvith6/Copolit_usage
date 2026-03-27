import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import ChatApp from './components/ChatApp';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('wa_token');
    const savedUser = localStorage.getItem('wa_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('wa_token', tokenData);
    localStorage.setItem('wa_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('wa_token');
    localStorage.removeItem('wa_user');
  };

  if (!user) {
    return showRegister
      ? <Register onLogin={handleLogin} onSwitch={() => setShowRegister(false)} />
      : <Login onLogin={handleLogin} onSwitch={() => setShowRegister(true)} />;
  }

  return <ChatApp user={user} token={token} onLogout={handleLogout} />;
}

export default App;
