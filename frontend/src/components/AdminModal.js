import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    
    const [{ data: catData }, { data: questionsData }, { data: deptData }] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('questions').select('*, categories(name)').order('id'),
      supabase.from('departments').select('*')
    ]);
    
    setCategories(catData || []);
    setQuestions(questionsData || []);
    setDepartamentos(deptData || []);
    
    // Cargar estadísticas
    const { data: sessionsData } = await supabase
      .from('game_sessions')
      .select('*, profiles(first_name, last_name)');
    
    calculateStats(sessionsData || []);
    setLoading(false);
  };

  const calculateStats = (sessions) => {
    const userStats = {};
    
    sessions.forEach(session => {
      if (!userStats[session.user_id]) {
        userStats[session.user_id] = {
          name: session.profiles?.first_name + ' ' + session.profiles?.last_name || 'Anónimo',
          totalGames: 0,
          correctAnswers: 0,
          totalXP: 0
        };
      }
      userStats[session.user_id].totalGames++;
      userStats[session.user_id].correctAnswers += session.correct_answers || 0;
      userStats[session.user_id].totalXP += session.xp_earned || 0;
    });

    setStats({ users: userStats, totalGames: sessions.length });
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Sidebar */}
        <div style={sidebarStyle}>
          <h2 style={{ color: 'white', marginBottom: '2rem' }}>⚙️ Admin</h2>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
              📊 Dashboard
            </TabButton>
            <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')}>
              ❓ Preguntas
            </TabButton>
            <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>
              🏷️ Categorías y Deptos
            </TabButton>
            <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
              🧠 Análisis IA
            </TabButton>
          </nav>
          <button onClick={onClose} style={closeButtonStyle}>✕ Cerrar</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
          {loading ? (
            <div>Cargando...</div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardTab stats={stats} />
              )}
              {activeTab === 'questions' && (
                <div>
                  <h2>❓ Gestión de Preguntas</h2>
                  <p>Total: {questions.length} preguntas</p>
                </div>
              )}
              {activeTab === 'categories' && (
                <div>
                  <h2>🏷️ Categorías y Departamentos</h2>
                  <p>Categorías: {categories.length}</p>
                  <p>Departamentos: {departamentos.length}</p>
                </div>
              )}
              {activeTab === 'analytics' && (
                <AnalyticsTab 
                  stats={stats}
                  questions={questions}
                  categories={categories}
                  departamentos={departamentos}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Dashboard Tab
const DashboardTab = ({ stats }) => (
  <div>
    <h2 style={{ marginBottom: '1.5rem' }}>📊 Dashboard</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      <StatCard title="Total Partidas" value={stats?.totalGames || 0} color="#3B82F6" />
      <StatCard title="Jugadores Activos" value={Object.keys(stats?.users || {}).length} color="#10B981" />
      <StatCard title="Promedio" value="65%" color="#F59E0B" />
    </div>
  </div>
);

// ✅ ANALYTICS TAB CON LOS 2 BOTONES (Ver Empleados + Ejecutar Análisis IA)
const AnalyticsTab = ({ stats, questions, categories, departamentos }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Cargar empleados - CORREGIDO sin 'department'
  const loadEmployees = async () => {
    console.log('🔵 Cargando empleados...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, level, total_xp')
      .order('first_name');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ Datos recibidos:', data);
    setEmployees(data || []);
    setShowEmployees(true);
    setShowAnalysis(false);
  };

  // Ejecutar análisis de IA
  const runAnalysis = async () => {
    setLoading(true);
    setShowAnalysis(true);
    setShowEmployees(false);

    const { data: sessionsData } = await supabase
      .from('game_sessions')
      .select('*, profiles(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    const analysis = processAnalysisData(sessionsData || [], questions);
    setAnalysisData(analysis);
    setLoading(false);
  };

  const processAnalysisData = (sessions, allQuestions) => {
    const result = {
      totalGames: sessions.length,
      openTextStats: {
        total: 0,
        correct: 0,
        incorrect: 0,
        byCategory: {},
        byDepartment: {}
      },
      userAnalysis: {}
    };

    sessions.forEach(session => {
      const answers = session.answers || [];
      
      if (!result.userAnalysis[session.user_id]) {
        result.userAnalysis[session.user_id] = {
          name: session.profiles?.first_name + ' ' + session.profiles?.last_name || 'Anónimo',
          totalGames: 0,
          correctAnswers: 0,
          totalQuestions: 0,
          weakAreas: []
        };
      }

      result.userAnalysis[session.user_id].totalGames++;

      answers.forEach(answer => {
        result.userAnalysis[session.user_id].totalQuestions++;
        
        if (answer.is_correct) {
          result.userAnalysis[session.user_id].correctAnswers++;
        }

        if (answer.question_type === 'open_text') {
          result.openTextStats.total++;
          
          if (answer.is_correct) {
            result.openTextStats.correct++;
          } else {
            result.openTextStats.incorrect++;
            
            const question = allQuestions.find(q => q.id === answer.question_id);
            if (question) {
              const catName = question.categories?.name || 'General';
              if (!result.userAnalysis[session.user_id].weakAreas.includes(catName)) {
                result.userAnalysis[session.user_id].weakAreas.push(catName);
              }
            }
          }
        }
      });
    });

    return result;
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>🧠 Análisis de IA</h2>
      
      {/* Botones principales */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={loadEmployees}
          style={{
            padding: '1rem 2rem',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          👥 Ver Empleados ({Object.keys(stats?.users || {}).length})
        </button>
        
        <button 
          onClick={runAnalysis}
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            background: loading ? '#9ca3af' : '#8B5CF6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {loading ? '⏳ Analizando...' : '🤖 Ejecutar Análisis IA'}
        </button>
      </div>

      {/* Lista de Empleados */}
      {showEmployees && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>👥 Empleados Registrados ({employees.length})</h3>
          
          {employees.map(emp => (
            <div 
              key={emp.id} 
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '1rem',
                borderLeft: '4px solid #3B82F6'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                {emp.first_name} {emp.last_name}
              </h4>
              
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                ✉️ {emp.email}
              </div>
              
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                🏢 Sin departamento
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                <span style={{ color: '#F59E0B' }}>⭐ Nivel: {emp.level || 1}</span>
                <span style={{ color: '#10B981' }}>🏆 XP: {emp.total_xp || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Análisis IA */}
      {showAnalysis && analysisData && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>📊 Resultados del Análisis</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard 
              title="Respuestas Abiertas" 
              value={analysisData.openTextStats.total} 
              color="#3B82F6" 
            />
            <StatCard 
              title="Correctas" 
              value={analysisData.openTextStats.correct} 
              color="#10B981" 
            />
            <StatCard 
              title="Incorrectas" 
              value={analysisData.openTextStats.incorrect} 
              color="#EF4444" 
            />
          </div>

          <h4 style={{ marginBottom: '1rem' }}>👤 Análisis por Empleado</h4>
          {Object.entries(analysisData.userAnalysis).map(([userId, user]) => {
            const accuracy = user.totalQuestions > 0 
              ? Math.round((user.correctAnswers / user.totalQuestions) * 100) 
              : 0;
            
            return (
              <div key={userId} style={{
                background: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                marginBottom: '1rem',
                borderLeft: `4px solid ${accuracy >= 70 ? '#10B981' : accuracy >= 40 ? '#F59E0B' : '#EF4444'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{user.name}</strong>
                  <span style={{ 
                    color: accuracy >= 70 ? '#10B981' : accuracy >= 40 ? '#F59E0B' : '#EF4444',
                    fontWeight: 'bold'
                  }}>
                    {accuracy}%
                  </span>
                </div>
                
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  🎮 {user.totalGames} partidas | ✅ {user.correctAnswers}/{user.totalQuestions} correctas
                </div>
                
                {user.weakAreas.length > 0 && (
                  <div style={{ 
                    background: '#fee2e2', 
                    padding: '0.75rem', 
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <strong>⚠️ Áreas a reforzar:</strong> {user.weakAreas.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Styles
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalContentStyle = {
  background: 'white',
  borderRadius: '1rem',
  width: '90%',
  maxWidth: '1000px',
  height: '90vh',
  display: 'flex',
  overflow: 'hidden'
};

const sidebarStyle = {
  width: '220px',
  background: '#1e3a5f',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column'
};

const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: '0.75rem 1rem',
    textAlign: 'left',
    background: active ? '#3B82F6' : 'transparent',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  }}>{children}</button>
);

const closeButtonStyle = {
  marginTop: 'auto',
  padding: '0.75rem',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer'
};

const StatCard = ({ title, value, color }) => (
  <div style={{
    background: color + '10',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    borderLeft: `4px solid ${color}`,
    textAlign: 'center'
  }}>
    <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</h3>
    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: color }}>{value}</p>
  </div>
);

export default AdminModal;
