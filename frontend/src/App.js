import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PAndL from './pages/PAndL';
import Ledger from './pages/Ledger';
import Accounts from './pages/Accounts';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { socket } from './utils/socket';
import { handleNotificationPulse, requestNativePermissions } from './utils/notifications';
import { registerPushSubscription } from './utils/push';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showBell, setShowBell] = useState(false);
  const pushSetupRef = useRef(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    if (savedToken) {
      setToken(savedToken);
      setUsername(savedUsername);
      setIsLoggedIn(true);

      const savedNotifs = localStorage.getItem(`gamdom-notifications-${savedUsername}`);
      if (savedNotifs) {
        try {
          setNotifications(JSON.parse(savedNotifs));
        } catch(e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      requestNativePermissions();
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
    }
  }, [token, username]);

  useEffect(() => {
    if (!token || !username) {
      return undefined;
    }

    if (!pushSetupRef.current) {
      registerPushSubscription(token).catch(err => {
        console.warn('Push registration failed:', err);
      });
      pushSetupRef.current = true;
    }

    const registerUser = () => socket.emit('register-user', username);

    if (socket.connected) {
      registerUser();
    } else {
      socket.on('connect', registerUser);
    }

    return () => {
      socket.off('connect', registerUser);
    };
  }, [token, username]);

  useEffect(() => {
    if (!token || !username) return;

    const handlePing = (payload) => {
      if (payload && payload.action) {
        const qualifyForHistory = handleNotificationPulse(payload, username);
        if (qualifyForHistory) {
          const actorInitial = payload.actorInitial || (payload.user ? payload.user.trim().charAt(0).toUpperCase() : '');
          const newNotif = {
            id: Date.now(),
            action: payload.action,
            user: payload.user,
            module: payload.module,
            body: payload.body,
            actorInitial,
            changes: payload.changes || [],
            date: new Date().toISOString(),
            read: false
          };
          setNotifications(prev => {
            const updated = [newNotif, ...prev];
            localStorage.setItem(`gamdom-notifications-${username}`, JSON.stringify(updated));
            return updated;
          });
        }
      }
    };

    socket.on('realtime-update', handlePing);
    return () => {
      socket.off('realtime-update', handlePing);
    };
  }, [token, username]);

  const handleLogin = (token, username) => {
    pushSetupRef.current = true;
    setToken(token);
    setUsername(username);
    setIsLoggedIn(true);
    requestNativePermissions();
    registerPushSubscription(token).catch(err => {
      console.warn('Push registration failed:', err);
    });
  };

  const handleLogout = () => {
    socket.disconnect();
    setToken('');
    setUsername('');
    setNotifications([]);
    setIsLoggedIn(false);
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(`gamdom-notifications-${username}`);
  };

  const handleOpenPanel = () => {
    setShowBell(!showBell);
    // optionally mark read
    if (!showBell && notifications.some(n => !n.read)) {
       const readAll = notifications.map(n => ({...n, read: true}));
       setNotifications(readAll);
       localStorage.setItem(`gamdom-notifications-${username}`, JSON.stringify(readAll));
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <ToastContainer />
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              🏪 Gamdom Finance
            </Link>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link to="/" className="nav-link">Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link to="/pl" className="nav-link">P&L</Link>
              </li>
              <li className="nav-item">
                <Link to="/ledger" className="nav-link">Ledger</Link>
              </li>
              <li className="nav-item">
                <Link to="/accounts" className="nav-link">Accounts</Link>
              </li>
              <li className="nav-item">
                <span className="username">Welcome, {username}</span>
              </li>
              <li className="nav-item">
                <button className="nav-bell" onClick={handleOpenPanel}>
                  🔔
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="badge">{notifications.filter(n => !n.read).length}</span>
                  )}
                </button>
                {showBell && (
                  <div className="notification-panel">
                    <div className="notification-panel-header">
                      <span>Notifications</span>
                      <button className="clear-btn" onClick={clearNotifications}>Clear All</button>
                    </div>
                    <div className="notification-list">
                      {notifications.length === 0 ? (
                        <div className="no-notifications">No notifications found</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`}>
                            <strong>{n.actorInitial || (n.user ? n.user.charAt(0).toUpperCase() : '')}</strong> {n.body || `${n.action} inside ${n.module}`}
                            <span className="notification-time">
                              {new Date(n.date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </li>
              <li className="nav-item">
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </li>
            </ul>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard token={token} username={username} />} />
          <Route path="/pl" element={<PAndL token={token} username={username} />} />
          <Route path="/ledger" element={<Ledger token={token} username={username} />} />
          <Route path="/accounts" element={<Accounts token={token} username={username} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
