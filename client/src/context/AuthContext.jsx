import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab session ID uniquely identifies this browser tab and persists across tab refreshes
  const sessionId = useMemo(() => {
    let sid = sessionStorage.getItem('tab_session_id');
    if (!sid) {
      sid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('tab_session_id', sid);
    }
    return sid;
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('role');

    if (token && token !== 'undefined') {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
        setRole(decoded.role || null);
      } catch {
        sessionStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // Server-side Heartbeat: Extends the active session lease every 5 seconds while tab is open
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        await api.post('/auth/heartbeat', { sessionId });
      } catch (err) {
        // If session was claimed by another tab or expired
        if (err.response?.status === 409) {
          console.warn('Session expired or claimed in another tab');
        }
      }
    };

    // Send immediately once user is loaded
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [user, sessionId]);

  const login = useCallback((token, explicitRole, data, serverSessionId) => {
    const activeSessionId = serverSessionId || sessionId;
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('tab_session_id', activeSessionId);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    const decoded = jwtDecode(token);
    setUser(decoded);
    setRole(explicitRole || decoded.role || null);
  }, [sessionId]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', { sessionId });
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('viewGymId');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setUser(null);
      setRole(null);
    }
  }, [sessionId]);

  const authValue = useMemo(() => ({
    user,
    role,
    sessionId,
    login,
    logout,
    loading
  }), [user, role, sessionId, login, logout, loading]);

  return (
    <AuthContext.Provider value={authValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

