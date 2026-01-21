import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Agenda from './pages/Agenda';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {!user ? (
           <>
             <Route path="/login" element={<Login />} />
             <Route path="*" element={<Navigate to="/login" replace />} />
           </>
        ) : (
           <Route path="/" element={<MainLayout />}>
             <Route index element={<Agenda />} />
             <Route path="clients" element={<Clients />} />
             <Route path="reports" element={<Reports />} />
             <Route path="login" element={<Navigate to="/" replace />} />
           </Route>
        )}
      </Routes>
    </Router>
  );
}

export default App;
