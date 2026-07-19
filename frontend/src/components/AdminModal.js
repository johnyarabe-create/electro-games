import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    
    // Cargar preguntas
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*, categories(name)')
      .order('id');
    
    // Cargar estadísticas
    const { data: sessionsData } = await supabase
      .from('game_sessions')
      .select('*, profiles(first_name, last_name)');
    
    setQuestions(questionsData || []);
    calculateStats(sessionsData || []);
    setLoading(false);
  };

  const calculateStats = (sessions) => {
    // Análisis por categoría
    const categoryStats = {};
    const userStats = {};
    
    sessions.forEach(session => {
      // Estadísticas por usuario
      if (!userStats[session.user_id]) {
        userStats[session.user_id] = {
          name: session.profiles?.first_name + ' ' + session.profiles?.last_name,
          totalGames: 0,
          correctAnswers: 0,
          totalQuestions: 0,
          weakCategories: {}
        };
      }
      
      userStats[session.user_id].totalGames++;
      userStats[session.user_id].correctAnswers += session.correct_answers;
      userStats[session.user_id].totalQuestions += session.total_questions;
    });
    
    setStats({ users: userStats, totalSessions: sessions.length });
  };

  // Análisis de IA (reglas inteligentes)
  const analyzeUser = (userId) => {
    const user = stats?.users[userId];
    if (!user) return null;
    
    const accuracy = (user.correctAnswers / user.totalQuestions) * 100;
    const analysis = {
      score: accuracy.toFixed(1),
      level: accuracy >= 80 ? 'Excelente' : accuracy >= 60 ? 'Bueno' : 'Necesita Mejora',
      recommendations: []
    };
    
    if (accuracy < 60) {
      analysis.recommendations.push('📚 Reforzar capacitación en productos');
    }
    if (user.totalGames < 5) {
      analysis.recommendations.push('🎮 Incentivar más práctica con el juego');
    }
    
    return analysis;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        width: '90%',
        maxWidth: '1200px',
        height: '90%',
        borderRadius: '1rem',
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Menú Lateral */}
        <div style={{
          width: '250px',
          background: '#1e293b',
          color: 'white',
          padding: '1.5rem'
        }}>
          <h2 style={{ marginBottom: '2rem' }}>⚙️ Admin</h2>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={menuButtonStyle(activeTab === 'dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              style={menuButtonStyle(activeTab === 'questions')}
            >
              ❓ Preguntas
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={menuButtonStyle(activeTab === 'analytics')}
            >
              🧠 Análisis IA
            </button>
          </nav>
          
          <button
            onClick={onClose}
            style={{
              marginTop: 'auto',
              padding: '0.75rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              marginTop: '2rem'
            }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
          {loading ? (
            <div>Cargando...</div>
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
              {activeTab === 'questions' && <QuestionsTab questions={questions} onUpdate={fetchData} />}
              {activeTab === 'analytics' && <AnalyticsTab stats={stats} analyzeUser={analyzeUser} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-componentes
const DashboardTab = ({ stats }) => (
  <div>
    <h2 style={{ marginBottom: '1.5rem' }}>📊 Dashboard</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      <StatCard title="Total Sesiones" value={stats?.totalSessions || 0} color="#3B82F6" />
      <StatCard title="Usuarios Activos" value={Object.keys(stats?.users || {}).length} color="#10B981" />
      <StatCard title="Promedio General" value="65%" color="#F59E0B" />
    </div>
  </div>
);

const QuestionsTab = ({ questions, onUpdate }) => {
  const [editing, setEditing] = useState(null);
  
  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>❓ Gestión de Preguntas</h2>
      <button style={{
        padding: '0.75rem 1.5rem',
        background: '#10B981',
        color: 'white',
        border: 'none',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        cursor: 'pointer'
      }}>
        + Nueva Pregunta
      </button>
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={thStyle}>Pregunta</th>
            <th style={thStyle}>Categoría</th>
            <th style={thStyle}>Dificultad</th>
            <th style={thStyle}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(q => (
            <tr key={q.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={tdStyle}>{q.question_text.substring(0, 50)}...</td>
              <td style={tdStyle}>{q.categories?.name}</td>
              <td style={tdStyle}>{'⭐'.repeat(q.difficulty)}</td>
              <td style={tdStyle}>
                <button style={actionButtonStyle}>✏️</button>
                <button style={actionButtonStyle}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AnalyticsTab = ({ stats, analyzeUser }) => (
  <div>
    <h2 style={{ marginBottom: '1.5rem' }}>🧠 Análisis de IA</h2>
    <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
      Análisis automático de desempeño y recomendaciones personalizadas
    </p>
    
    {stats?.users && Object.entries(stats.users).map(([userId, user]) => {
      const analysis = analyzeUser(userId);
      return (
        <div key={userId} style={{
          background: '#f9fafb',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          marginBottom: '1rem',
          borderLeft: '4px solid ' + (analysis?.score >= 80 ? '#10B981' : analysis?.score >= 60 ? '#F59E0B' : '#EF4444')
        }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{user.name}</h3>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Precisión: </span>
              <strong style={{ fontSize: '1.25rem', color: analysis?.score >= 80 ? '#10B981' : analysis?.score >= 60 ? '#F59E0B' : '#EF4444' }}>
                {analysis?.score}%
              </strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Nivel: </span>
              <strong>{analysis?.level}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Juegos: </span>
              <strong>{user.totalGames}</strong>
            </div>
          </div>
          
          {analysis?.recommendations.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>💡 Recomendaciones:</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ color: '#6b7280', marginBottom: '0.25rem' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// Estilos auxiliares
const menuButtonStyle = (active) => ({
  padding: '0.75rem 1rem',
  textAlign: 'left',
  background: active ? '#3B82F6' : 'transparent',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

const StatCard = ({ title, value, color }) => (
  <div style={{
    background: color + '10',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    borderLeft: `4px solid ${color}`
  }}>
    <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</h3>
    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: color }}>{value}</p>
  </div>
);

const thStyle = { padding: '1rem', textAlign: 'left', fontWeight: '600' };
const tdStyle = { padding: '1rem' };
const actionButtonStyle = {
  padding: '0.5rem',
  marginRight: '0.5rem',
  background: 'transparent',
  border: '1px solid #e5e7eb',
  borderRadius: '0.25rem',
  cursor: 'pointer'
};

export default AdminModal;
