import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Agenda from './pages/Agenda';
import Clients from './pages/Clients';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Agenda />} />
          <Route path="clients" element={<Clients />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
