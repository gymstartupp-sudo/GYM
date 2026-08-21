import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
});

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token');
  if (token && token !== 'undefined') config.headers.Authorization = `Bearer ${token}`;
  
  const viewGymId = sessionStorage.getItem('viewGymId');
  if (viewGymId) {
    config.headers['x-gym-id'] = viewGymId;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      // If we aren't already on login page, redirect to prevent loop
      if (window.location.pathname !== '/login') {
          const reason = status === 403 ? 'suspended' : 'expired';
          window.location.href = `/login?reason=${reason}`;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
