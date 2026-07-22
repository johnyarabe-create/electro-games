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
              {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
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

// Analytics Tab - Análisis completo de todas las respuestas
const AnalyticsTab = ({ stats, questions, categories, departamentos }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Cargar empleados - CORREGIDO sin 'department'
  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, level, total_xp')
      .order('first_name');
    
    if (error) {
      console.error('Error cargando empleados:', error);
      return;
    }
    
    setEmployees(data || []);
    setShowEmployees(true);
    setShowAnalysis(false);
  };

  // Ejecutar análisis de IA - Analiza TODAS las respuestas
  const runAnalysis = async () => {
    setLoading(true);
    setShowAnalysis(true);
    setShowEmployees(false);

    const { data: sessionsData } = await supabase
      .from('game_sessions')
      .select('*, profiles(first_name, last_name, email, level, total_xp)')
      .order('created_at', { ascending: false })
      .limit(100);

    const analysis = processAnalysisData(sessionsData || [], questions);
    setAnalysisData(analysis);
    setLoading(false);
  };

  // Análisis completo: opción múltiple + texto abierto
  const processAnalysisData = (sessions, allQuestions) => {
    const result = {
      totalGames: sessions.length,
      overallStats: {
        totalAnswers: 0,
        correctAnswers: 0,
        accuracy: 0
      },
      byQuestionType: {
        multiple_choice: { total: 0, correct: 0, accuracy: 0 },
        open_text: { total: 0, correct: 0, accuracy: 0 }
      },
      byCategory: {},
      byDepartment: {},
      userAnalysis: {},
      weakAreas: [],
      recommendations: []
    };

    sessions.forEach(session => {
      const answers = session.answers || [];
      const userName = session.profiles?.first_name + ' ' + session.profiles?.last_name || 'Anónimo';
      
      if (!result.userAnalysis[session.user_id]) {
        result.userAnalysis[session.user_id] = {
          name: userName,
          email: session.profiles?.email,
          level: session.profiles?.level || 1,
          totalXP: session.profiles?.total_xp || 0,
          totalGames: 0,
          totalAnswers: 0,
          correctAnswers: 0,
          byType: {
            multiple_choice: { total: 0, correct: 0 },
            open_text: { total: 0, correct: 0 }
          },
          weakCategories: [],
          strongCategories: []
        };
      }

      const user = result.userAnalysis[session.user_id];
      user.totalGames++;

      answers.forEach(answer => {
        const question = allQuestions.find(q => q.id === answer.question_id);
        if (!question) return;

        const questionType = answer.question_type || 'multiple_choice';
        const catName = question.categories?.name || 'General';
        const deptName = question.department_id ? 
          (departamentos.find(d => d.id === question.department_id)?.name || 'Sin departamento') 
          : 'Sin departamento';

        result.overallStats.totalAnswers++;
        user.totalAnswers++;
        
        result.byQuestionType[questionType].total++;
        user.byType[questionType].total++;

        if (answer.is_correct) {
          result.overallStats.correctAnswers++;
          result.byQuestionType[questionType].correct++;
          user.correctAnswers++;
          user.byType[questionType].correct++;
          
          if (!user.strongCategories.includes(catName)) {
            user.strongCategories.push(catName);
          }
        } else {
          if (!user.weakCategories.includes(catName)) {
            user.weakCategories.push(catName);
          }
        }

        if (!result.byCategory[catName]) {
          result.byCategory[catName] = { total: 0, correct: 0, byType: { multiple_choice: 0, open_text: 0 } };
        }
        result.byCategory[catName].total++;
        result.byCategory[catName].byType[questionType]++;
        if (answer.is_correct) result.byCategory[catName].correct++;

        if (!result.byDepartment[deptName]) {
          result.byDepartment[deptName] = { total: 0, correct: 0 };
        }
        result.byDepartment[deptName].total++;
        if (answer.is_correct) result.byDepartment[deptName].correct++;
      });
    });

    result.overallStats.accuracy = result.overallStats.totalAnswers > 0 
      ? Math.round((result.overallStats.correctAnswers / result.overallStats.totalAnswers) * 100) 
      : 0;

    Object.keys(result.byQuestionType).forEach(type => {
      const stats = result.byQuestionType[type];
      stats.accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    });

    Object.entries(result.userAnalysis).forEach(([userId, user]) => {
      user.accuracy = user.totalAnswers > 0 
        ? Math.round((user.correctAnswers / user.totalAnswers) * 100) 
        : 0;

      Object.keys(user.byType).forEach(type => {
        const typeStats = user.byType[type];
        typeStats.accuracy = typeStats.total > 0 
          ? Math.round((typeStats.correct / typeStats.total) * 100) 
          : 0;
      });

      const recs = [];
      
      if (user.accuracy < 60) {
        recs.push({ type: 'critical', message: 'Necesita capacitación urgente en conceptos básicos' });
      } else if (user.accuracy < 75) {
        recs.push({ type: 'improvement', message: 'Recomendado repasar materiales de estudio' });
      }

      if (user.byType.open_text.total > 0 && user.byType.open_text.accuracy < 60) {
        recs.push({ type: 'weak_open_text', message: 'Dificultad en respuestas abiertas - practicar más' });
      }

      if (user.weakCategories.length > 0) {
        recs.push({ type: 'weak_categories', message: `Reforzar: ${user.weakCategories.slice(0, 3).join(', ')}` });
      }

      if (user.totalGames < 5) {
        recs.push({ type: 'experience', message: 'Jugar más partidas para ganar experiencia' });
      }

      user.recommendations = recs;
      result.recommendations.push(...recs.map(r => ({ ...r, user: user.name })));
    });

    result.weakAreas = Object.entries(result.byCategory)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        byType: stats.byType
      }))
      .filter(area => area.accuracy < 70 && area.total > 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    return result;
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>🧠 Análisis de IA</h2>
      
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
            fontSize: '1rem'
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
            fontSize: '1rem'
          }}
        >
          {loading ? '⏳ Analizando...' : '🤖 Ejecutar Análisis IA'}
        </button>
      </div>

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
              <h4 style={{ margin: '0 0 0.5rem 0' }}>
                {emp.first_name} {emp.last_name}
              </h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                ✉️ {emp.email}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                🏢 Sin departamento
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span style={{ color: '#F59E0B' }}>⭐ Nivel: {emp.level || 1}</span>
                <span style={{ color: '#10B981' }}>🏆 XP: {emp.total_xp || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAnalysis && analysisData && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>📊 Resultados del Análisis</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard title="Precisión Global" value={`${analysisData.overallStats.accuracy}%`} color="#3B82F6" />
            <StatCard title="Opción Múltiple" value={`${analysisData.byQuestionType.multiple_choice.accuracy}%`} color="#10B981" />
            <StatCard title="Texto Abierto" value={`${analysisData.byQuestionType.open_text.accuracy}%`} color="#8B5CF6" />
            <StatCard title="Total Respuestas" value={analysisData.overallStats.totalAnswers} color="#F59E0B" />
          </div>

          <h4 style={{ marginBottom: '1rem' }}>📁 Por Categoría</h4>
          <div style={{ marginBottom: '2rem' }}>
            {Object.entries(analysisData.byCategory).map(([catName, catStats]) => (
              <div key={catName} style={{
                background: '#f9fafb',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{catName}</span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#3B82F6' }}>{catStats.byType.multiple_choice} mult.</span>
                  <span style={{ color: '#8B5CF6' }}>{catStats.byType.open_text} texto</span>
                  <span style={{ 
                    color: catStats.accuracy >= 70 ? '#10B981' : catStats.accuracy >= 50 ? '#F59E0B' : '#EF4444',
                    fontWeight: 'bold'
                  }}>
                    {catStats.accuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <h4 style={{ marginBottom: '1rem' }}>👤 Análisis por Empleado</h4>
          {Object.entries(analysisData.userAnalysis).map(([userId, user]) => (
            <div key={userId} style={{
              background: '#f9fafb',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              marginBottom: '1rem',
              borderLeft: `4px solid ${user.accuracy >= 70 ? '#10B981' : user.accuracy >= 50 ? '#F59E0B' : '#EF4444'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{user.name}</strong>
                  <span style={{ marginLeft: '1rem', color: '#6b7280' }}>Nivel {user.level}</span>
                </div>
                <span style={{ 
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: user.accuracy >= 70 ? '#10B981' : user.accuracy >= 50 ? '#F59E0B' : '#EF4444'
                }}>
                  {user.accuracy}%
                </span>
              </div>
              
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                🎮 {user.totalGames} juegos | ✅ {user.correctAnswers}/{user.totalAnswers} correctas | 🏆 {user.totalXP} XP
              </div>

              <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: '#10B981' }}>
                  🎯 Opción Múltiple: {user.byType.multiple_choice.accuracy}% ({user.byType.multiple_choice.correct}/{user.byType.multiple_choice.total})
                </span>
                <span style={{ color: '#8B5CF6' }}>
                  📝 Texto Abierto: {user.byType.open_text.accuracy}% ({user.byType.open_text.correct}/{user.byType.open_text.total})
                </span>
              </div>
              
              {user.weakCategories.length > 0 && (
                <div style={{ 
                  background: '#fee2e2', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  <strong>⚠️ Áreas a reforzar:</strong> {user.weakCategories.join(', ')}
                </div>
              )}

              {user.strongCategories.length > 0 && (
                <div style={{ 
                  background: '#d1fae5', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}>
                  <strong>✅ Fortalezas:</strong> {user.strongCategories.join(', ')}
                </div>
              )}

              {user.recommendations.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <strong style={{ fontSize: '0.875rem' }}>💡 Recomendaciones:</strong>
                  <ul style={{ margin: '0.25rem 0 0 1.25rem', fontSize: '0.875rem' }}>
                    {user.recommendations.map((rec, idx) => (
                      <li key={idx} style={{ 
                        color: rec.type === 'critical' ? '#dc2626' : rec.type === 'improvement' ? '#d97706' : '#059669'
                      }}>
                        {rec.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {analysisData.weakAreas.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>📉 Áreas Débiles Globales</h4>
              {analysisData.weakAreas.map((area, idx) => (
                <div key={idx} style={{
                  background: '#fef3c7',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{area.name}</span>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>{area.total} preguntas</span>
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{area.accuracy}% precisión</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
