import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Dashboard = () => {
  const { profile } = useAuthStore();

  const xpForNextLevel = Math.round(100 * Math.pow((profile?.level || 1) + 1, 1.5));
  const xpProgress = ((profile?.current_xp || 0) / xpForNextLevel) * 100;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>¡Bienvenido, {profile?.first_name}! 👋</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Continúa aprendiendo y sube de nivel</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '1rem', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #3B82F6'
        }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>NIVEL ACTUAL</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3B82F6', margin: 0 }}>{profile?.level || 1}</p>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '1rem', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #10B981'
        }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>XP TOTAL</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10B981', margin: 0 }}>{profile?.total_xp || 0}</p>
        </div>
        
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '1rem', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #F59E0B'
        }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>RACHA</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#F59E0B', margin: 0 }}>{profile?.streak_days || 0} <span style={{ fontSize: '1rem' }}>días</span></p>
        </div>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Progreso al siguiente nivel</span>
          <span>{Math.round(xpProgress)}%</span>
        </div>
        <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '12px' }}>
          <div style={{ 
            width: `${xpProgress}%`, 
            background: 'linear-gradient(90deg, #3B82F6, #10B981)', 
            height: '100%', 
            borderRadius: '9999px',
            transition: 'width 0.5s ease'
          }}></div>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
          {profile?.current_xp || 0} / {xpForNextLevel} XP
        </p>
      </div>
<Link 
  to="/game-config"  // ← Cambiado de /game a /game-config
  style={{ 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)', 
    color: 'white', 
    padding: '1rem 2rem', 
    borderRadius: '0.75rem', 
    textDecoration: 'none', 
    fontSize: '1.125rem',
    fontWeight: '600',
    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
  }}
>
  ▶️ Jugar Ahora
</Link>

