import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Register({ onLogin, onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API}/auth/register`, form);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="logo-icon">💬</div>
          <h1>WhatsApp</h1>
        </div>
        <h2>Create Account</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Username" value={form.username}
            onChange={e => setForm({...form, username: e.target.value})} required />
          <input type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} required />
          <input type="password" placeholder="Password" value={form.password}
            onChange={e => setForm({...form, password: e.target.value})} required />
          <button type="submit">Create Account</button>
        </form>
        <p>Already have an account? <span className="link" onClick={onSwitch}>Sign In</span></p>
      </div>
    </div>
  );
}
