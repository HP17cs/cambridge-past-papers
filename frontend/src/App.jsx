import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import PastPapers from './pages/PastPapers';
import PaperDetail from './pages/PaperDetail';
import Progress from './pages/Progress';
import Ignored from './pages/Ignored';
import Settings from './pages/Settings';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user?.isAdmin) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
          <Route path="/subjects/:id" element={<ProtectedRoute><SubjectDetail /></ProtectedRoute>} />
          <Route path="/papers" element={<ProtectedRoute><PastPapers /></ProtectedRoute>} />
          <Route path="/papers/:id" element={<ProtectedRoute><PaperDetail /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/ignored" element={<ProtectedRoute><Ignored /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 px-4">
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} Cambridge Past Papers &middot; Made by HP17
        </p>
      </footer>
    </div>
  );
}
