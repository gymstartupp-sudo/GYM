import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (token && token !== 'undefined') {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
        setRole(storedRole);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((token, role) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    const decoded = jwtDecode(token);
    setUser(decoded);
    setRole(role);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    sessionStorage.removeItem('viewGymId');
    setUser(null);
    setRole(null);
  }, []);

  const authValue = useMemo(() => ({
    user,
    role,
    login,
    logout,
    loading
  }), [user, role, login, logout, loading]);

  return (
    <AuthContext.Provider value={authValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
