import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Clear legacy localStorage role entry if present
    localStorage.removeItem('role');

    if (token && token !== 'undefined') {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
        setRole(decoded.role || null);
      } catch {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((token, explicitRole) => {
    localStorage.setItem('token', token);
    localStorage.removeItem('role');
    const decoded = jwtDecode(token);
    setUser(decoded);
    setRole(explicitRole || decoded.role || null);
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
