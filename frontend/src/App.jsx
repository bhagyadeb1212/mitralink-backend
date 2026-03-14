import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Login from './pages/Login';
import ChatDashboard from './pages/ChatDashboard';
import AdminPanel from './pages/AdminPanel';
import useStore from './store';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = useStore(state => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
};

function App() {
  const fetchUserProfile = useStore(state => state.fetchUserProfile);
  const connectSocket = useStore(state => state.connectSocket);
  const token = useStore(state => state.token);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      connectSocket(token);
    }
  }, [token, fetchUserProfile, connectSocket]);

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
