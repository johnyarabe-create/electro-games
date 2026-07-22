import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('analytics'); // Por defecto abre en Análisis IA
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
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
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Sidebar */}
        <div style={sidebarStyle}>
          <h2 style={{ color: 'white', marginBottom: '2rem' }}>⚙️ Admin</h2>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
              🧠 Análisis IA
            </TabButton>
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
              📊 Dashboard
            </TabButton>
            <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')}>
              ❓ Preguntas
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
              {activeTab === 'analytics' && (
                <AnalyticsTab 
                  questions={questions} 
                  categories={categories} 
                  departamentos={departamentos} 
                />
              )}
              {activeTab === 'dashboard' && (
                <div>
                  <h2>📊 Dashboard</h2>
                  <p>En construcción...</p>
                </div>
              )}
              {activeTab === 'questions' && (
                <div>
                  <h2>❓ Preguntas</h2>
                  <p>Total: {questions.length} preguntas</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ✅ ANALYTICS TAB CON ANÁLISIS DE RESPUESTAS ABIERTAS
const AnalyticsTab = ({ questions, categories, departamentos }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmployees, setShowEmployees] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    const { data: sessionsData } = await supabase
      .from('game_sessions')
      .select('*, profiles(first_name, last_name, email, level, total_xp)')
      .order('created_at', { ascending: false })
      .limit(100);

    const analysis = processAnalysisData(sessionsData || [], questions);
    setAnalysisData(analysis);
    setLoading(false);
  };

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
  };

  const processAnalysisData = (sessions, allQuestions) => {
    const stats = {
      totalGames: sessions.length,
      openTextStats: {
        total: 0,
        correct: 0,
        incorrect: 0,
        byCategory: {},
        byDepartment: {},
        weakAreas: []
      },
      multipleChoiceStats: {
        total: 0,
        correct: 0,
        byCategory: {}
      },
      userStats: {},
      recommendations: []
    };

    sessions.forEach(session => {
      const answers = session.answers || [];
      const userName = session.profiles?.first_name + ' ' + session.profiles?.last_name || 'Anónimo';
      
      // Stats por usuario
      if (!stats.userStats[session.user_id]) {
        stats.userStats[session.user_id] = {
          name: userName,
          totalGames: 0,
          openTextCorrect: 0,
          openTextTotal: 0,
          multipleCorrect: 0,
          multipleTotal: 0,
          weakCategories: []
        };
      }
      
      stats.userStats[session.user_id].totalGames++;

      answers.forEach(answer => {
        const question = allQuestions.find(q => q.id === answer.question_id);
        if (!question) return;

        const catName = question.categories?.name || 'Sin categoría';
        const deptName = question.department_id ? 
          (departamentos.find(d => d.id === question.department_id)?.name || 'Sin departamento') 
          : 'Sin departamento';

        if (answer.question_type === 'open_text') {
          // Respuesta abierta
          stats.openTextStats.total++;
          
          if (answer.is_correct) {
            stats.openTextStats.correct++;
            stats.userStats[session.user_id].openTextCorrect++;
          } else {
            stats.openTextStats.incorrect++;
            
            // Áreas débiles
            if (!stats.userStats[session.user_id].weakCategories.includes(catName)) {
              stats.userStats[session.user_id].weakCategories.push(catName);
            }
            
            // Registrar por categoría
            if (!stats.openTextStats.byCategory[catName]) {
              stats.openTextStats.byCategory[catName] = { total: 0, incorrect: 0 };
            }
            stats.openTextStats.byCategory[catName].total++;
            stats.openTextStats.byCategory[catName].incorrect++;
          }
          
          stats.userStats[session.user_id].openTextTotal++;

          // Por departamento
          if (!stats.openTextStats.byDepartment[deptName]) {
            stats.openTextStats.byDepartment[deptName] = { total: 0, incorrect: 0 };
          }
          stats.openTextStats.byDepartment[deptName].total++;
          if (!answer.is_correct) {
            stats.openTextStats.byDepartment[deptName].incorrect++;
          }

        } else {
          // Opción múltiple
          stats.multipleChoiceStats.total++;
          if (answer.is_correct) {
            stats.multipleChoiceStats.correct++;
            stats.userStats[session.user_id].multipleCorrect++;
          }
          stats.userStats[session.user_id].multipleTotal++;

          if (!stats.multipleChoiceStats.byCategory[catName]) {
            stats.multipleChoiceStats.byCategory[catName] = { total: 0, correct: 0 };
          }
          stats.multipleChoiceStats.byCategory[catName].total++;
          if (answer.is_correct) stats.multipleChoiceStats.byCategory[catName].correct++;
        }
      });
    });

    // Generar recomendaciones
    Object.entries(stats.userStats).forEach(([userId, user]) => {
      const openAccuracy = user.openTextTotal > 0 ? (user.openTextCorrect / user.openTextTotal) * 100 : 0;
      const multiAccuracy = user.multipleTotal > 0 ? (user.multipleCorrect / user.multipleTotal) * 100 : 0;
      
      if (openAccuracy < 60 && user.weakCategories.length > 0) {
        stats.recommendations.push({
          user: user.name,
          type: 'weak_areas',
          message: `Necesita refuerzo en: ${user.weakCategories.join(', ')}`,
          priority: 'high'
        });
      }
      
      if (multiAccuracy < 50) {
        stats.recommendations.push({
          user: user.name,
          type: 'knowledge_gap',
          message: 'Repasar conceptos básicos de producto',
          priority: 'medium'
        });
      }
    });

    // Áreas débiles globales
    Object.entries(stats.openTextStats.byCategory)
      .filter(([_, data]) => data.incorrect > 0)
      .sort((a, b) => (b[1].incorrect / b[1].total) - (a[1].incorrect / a[1].total))
      .slice(0, 3)
      .forEach(([catName, data]) => {
        stats.openTextStats.weakAreas.push({
          category: catName,
          errorRate: Math.round((data.incorrect / data.total) * 100)
        });
      });

    return stats;
  };

  if (loading) return <div>Cargando análisis...</div>;
  if (!analysisData) return <div>Sin datos</div>;

  const { openTextStats, multipleChoiceStats, userStats, recommendations } = analysisData;

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>🧠 Análisis de IA - Respuestas Abiertas</h2>

      {/* Botón Ver Empleados */}
      <div style={{ marginBottom: '2rem' }}>
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
          👥 Ver Empleados
        </button>
      </div>

      {/* Lista de Empleados */}
      {showEmployees && (
        <div style={{ marginBottom: '2rem', background: '#f9fafb', padding: '1.5rem', borderRadius: '0.75rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>👥 Empleados ({employees.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#e5e7eb' }}>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Nivel</th>
                <th style={thStyle}>XP</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>{emp.first_name} {emp.last_name}</td>
                  <td style={tdStyle}>{emp.email}</td>
                  <td style={tdStyle}>{emp.level || 1}</td>
                  <td style={tdStyle}>{emp.total_xp || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Estadísticas Generales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard 
          title="Respuestas Abiertas" 
          value={`${openTextStats.correct}/${openTextStats.total}`} 
          color="#3B82F6" 
        />
        <StatCard 
          title="Precisión Texto" 
          value={`${openTextStats.total > 0 ? Math.round((openTextStats.correct / openTextStats.total) * 100) : 0}%`} 
          color="#10B981" 
        />
        <StatCard 
          title="Áreas Débiles" 
          value={openTextStats.weakAreas.length} 
          color="#EF4444" 
        />
      </div>

      {/* Análisis por Usuario */}
      <h3 style={{ marginBottom: '1rem' }}>👤 Análisis por Empleado</h3>
      {Object.entries(userStats).map(([userId, user]) => {
        const openAccuracy = user.openTextTotal > 0 ? Math.round((user.openTextCorrect / user.openTextTotal) * 100) : 0;
        const multiAccuracy = user.multipleTotal > 0 ? Math.round((user.multipleCorrect / user.multipleTotal) * 100) : 0;
        
        return (
          <div key={userId} style={{
            background: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            marginBottom: '1rem',
            borderLeft: `4px solid ${openAccuracy >= 70 ? '#10B981' : openAccuracy >= 40 ? '#F59E0B' : '#EF4444'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0 }}>{user.name}</h4>
              <span style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold',
                color: openAccuracy >= 70 ? '#10B981' : openAccuracy >= 40 ? '#F59E0B' : '#EF4444'
              }}>
                {openAccuracy}%
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              <span>📝 Texto: {user.openTextCorrect}/{user.openTextTotal}</span>
              <span>🎯 Opción Múltiple: {user.multipleCorrect}/{user.multipleTotal}</span>
              <span>🎮 Total: {user.totalGames} juegos</span>
            </div>

            {user.weakCategories.length > 0 && (
              <div style={{ 
                background: '#fee2e2', 
                padding: '0.75rem', 
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#dc2626'
              }}>
                <strong>⚠️ Áreas a reforzar:</strong> {user.weakCategories.join(', ')}
              </div>
            )}
          </div>
        );
      })}

      {/* Áreas Débiles Globales */}
      {openTextStats.weakAreas.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📉 Áreas Débiles Globales</h3>
          {openTextStats.weakAreas.map((area, idx) => (
            <div key={idx} style={{
              background: '#fef3c7',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{area.category}</span>
              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{area.errorRate}% error</span>
            </div>
          ))}
        </div>
      )}

      {/* Recomendaciones */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>💡 Recomendaciones</h3>
          {recommendations.map((rec, idx) => (
            <div key={idx} style={{
              background: rec.priority === 'high' ? '#fee2e2' : '#dbeafe',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '0.5rem',
              borderLeft: `4px solid ${rec.priority === 'high' ? '#dc2626' : '#3B82F6'}`
            }}>
              <strong>{rec.user}:</strong> {rec.message}
            </div>
          ))}
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
  maxWidth: '1200px',
  height: '90vh',
  display: 'flex',
  overflow: 'hidden'
};

const sidebarStyle = {
  width: '250px',
  background: '#1f2937',
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
    marginBottom: '0.5rem'
  }}>{children}</button>
);

const closeButtonStyle = {
  marginTop: 'auto',
  padding: '0.75rem',
  background: '#374151',
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

const thStyle = { padding: '1rem', textAlign: 'left', fontWeight: '600', background: '#e5e7eb' };
const tdStyle = { padding: '1rem' };

export default AdminModal;
