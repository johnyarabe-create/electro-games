import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, level, total_xp')
      .order('total_xp', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    setLeaders(data.map((p, idx) => ({ ...p, rank: idx + 1 })));
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>🏆 Ranking de Jugadores</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Los mejores empleados del mes</p>
      
      <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>#</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Jugador</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Nivel</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>XP Total</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((player) => (
              <tr key={player.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: '1rem 1.5rem' }}>
                  {player.rank <= 3 ? (
                    <span style={{ fontSize: '1.5rem' }}>
                      {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    player.rank
                  )}
                </td>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>
                  {player.first_name} {player.last_name}
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                  <span style={{ 
                    background: '#DBEAFE', 
                    color: '#1E40AF', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '9999px',
                    fontWeight: '600'
                  }}>
                    {player.level}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 'bold', color: '#3B82F6' }}>
                  {player.total_xp.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;