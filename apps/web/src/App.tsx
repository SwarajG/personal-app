import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/features/Dashboard';
import AllPosts from '@/pages/AllPosts';
import MyPeople from '@/pages/MyPeople';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import MyTimeline from '@/pages/MyTimeline';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="diary-theme">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                  <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/all-posts"
            element={
              <ProtectedRoute>
                  <AllPosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-people"
            element={
              <ProtectedRoute>
                  <MyPeople />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-timeline"
            element={
              <ProtectedRoute>
                <MyTimeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                  <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                  <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
