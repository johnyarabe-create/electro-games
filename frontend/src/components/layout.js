import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Layout = () => {
  const navigate = useNavigate();
  const { logout, profile } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <nav style={{ background: '#3B82F6', color: 'white', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: 0 }}>⚡ Electro Games</h1>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Inicio</Link>
            <Link to="/game" style={{ color: 'white', textDecoration: 'none' }}>Jugar</Link>
            <Link to="/leaderboard" style={{ color: 'white', textDecoration: 'none' }}>Ranking</Link>
            <Link to="/profile" style={{ color: 'white', textDecoration: 'none' }}>Perfil</Link>
            <span style={{ opacity: 0.9 }}>| {profile?.first_name}</span>
            <button 
              onClick={handleLogout} 
              style={{ 
                background: 'transparent', 
                border: '1px solid white', 
                color: 'white', 
                padding: '0.5rem 1rem', 
                borderRadius: '0.25rem', 
                cursor: 'pointer' 
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </nav>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;