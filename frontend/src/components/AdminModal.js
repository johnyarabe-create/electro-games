import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para CRUD
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    category_id: '',
    difficulty: 1,
    xp_reward: 10
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    
    // Cargar categorías
    const { data: catData } = await supabase.from('categories').select('*');
    setCategories(catData || []);
    
    // Cargar preguntas
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*, categories(name)')
      .order('id');
    
    setQuestions(questionsData || []);
    
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
          name: session.profiles?.first_name + ' ' + session.profiles?.last_name,
          totalGames: 0,
          correctAnswers: 0,
          totalQuestions: 0
        };
      }
      
      userStats[session.user_id].totalGames++;
      userStats[session.user_id].correctAnswers += session.correct_answers;
      userStats[session.user_id].totalQuestions += session.total_questions;
    });
    
    setStats({ users: userStats, totalSessions: sessions.length });
  };

  // CRUD - Crear/Actualizar pregunta
  const saveQuestion = async () => {
    const questionData = {
      ...formData,
      options: JSON.stringify(formData.options),
      is_active: true
    };

    if (editingQuestion) {
      // Actualizar
      const { error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', editingQuestion.id);
      
      if (error) alert('Error al actualizar: ' + error.message);
    } else {
      // Crear nuevo
      const { error } = await supabase
        .from('questions')
        .insert([questionData]);
      
      if (error) alert('Error al crear: ' + error.message);
    }

    setShowForm(false);
    setEditingQuestion(null);
    resetForm();
    fetchData();
  };

  // CRUD - Eliminar pregunta
  const deleteQuestion = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);
    
    if (error) alert('Error al eliminar: ' + error.message);
    else fetchData();
  };

  // CRUD - Editar pregunta (cargar datos)
  const editQuestion = (question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      options: Array.isArray(question.options) ? question.options : JSON.parse(question.options),
      correct_answer: question.correct_answer,
      category_id: question.category_id,
      difficulty: question.difficulty,
      xp_reward: question.xp_reward
    });
    setShowForm(true);
  };

  // CRUD - Nueva pregunta
  const newQuestion = () => {
    setEditingQuestion(null);
    resetForm();
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      category_id: categories[0]?.id || '',
      difficulty: 1,
      xp_reward: 10
    });
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  // Análisis de IA
  const analyzeUser = (userId) => {
    const user = stats?.users[userId];
    if (!user) return null;
    
    const accuracy = (user.correctAnswers / user.totalQuestions) * 100;
    const analysis = {
      score: accuracy.toFixed(1),
      level: accuracy >= 80 ? '⭐⭐⭐ Excelente' : accuracy >= 60 ? '⭐⭐ Bueno' : '⭐ Necesita Mejora',
      recommendations: []
    };
    
    if (accuracy < 60) {
      analysis.recommendations.push('📚 Reforzar capacitación en productos');
      analysis.recommendations.push('🎯 Enfocarse en categorías de bajo rendimiento');
    }
    if (accuracy < 80) {
      analysis.recommendations.push('💡 Practicar técnicas de cierre de venta');
    }
    if (user.totalGames < 5) {
      analysis.recommendations.push('🎮 Incentivar más práctica con el juego');
    }
    
    return analysis;
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Menú Lateral */}
        <div style={sidebarStyle}>
          <h2 style={{ marginBottom: '2rem' }}>⚙️ Admin</h2>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
              📊 Dashboard
            </TabButton>
            <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')}>
              ❓ Preguntas ({questions.length})
            </TabButton>
            <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
              🧠 Análisis IA
            </TabButton>
          </nav>
          <button onClick={onClose} style={closeButtonStyle}>✕ Cerrar</button>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
          {loading ? <div>Cargando...</div> : (
            <>
              {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
              {activeTab === 'questions' && (
                <QuestionsTab 
                  questions={questions}
                  showForm={showForm}
                  formData={formData}
                  categories={categories}
                  editingQuestion={editingQuestion}
                  onNew={newQuestion}
                  onEdit={editQuestion}
                  onDelete={deleteQuestion}
                  onSave={saveQuestion}
                  onCancel={() => { setShowForm(false); resetForm(); }}
                  onFormChange={setFormData}
                  onOptionChange={updateOption}
                />
              )}
              {activeTab === 'analytics' && <AnalyticsTab stats={stats} analyzeUser={analyzeUser} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-componentes
const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} style={tabButtonStyle(active)}>{children}</button>
);

const DashboardTab = ({ stats }) => (
  <div>
    <h2 style={{ marginBottom: '1.5rem' }}>📊 Dashboard</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      <StatCard title="Total Sesiones" value={stats?.totalSessions || 0} color="#3B82F6" />
      <StatCard title="Usuarios Activos" value={Object.keys(stats?.users || {}).length} color="#10B981" />
      <StatCard title="Preguntas Totales" value={stats?.totalQuestions || 0} color="#F59E0B" />
    </div>
  </div>
);

const QuestionsTab = ({ 
  questions, showForm, formData, categories, editingQuestion,
  onNew, onEdit, onDelete, onSave, onCancel, onFormChange, onOptionChange 
}) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h2>❓ Gestión de Preguntas</h2>
      {!showForm && (
        <button onClick={onNew} style={newButtonStyle}>+ Nueva Pregunta</button>
      )}
    </div>

    {showForm ? (
      <div style={formStyle}>
        <h3>{editingQuestion ? '✏️ Editar Pregunta' : '➕ Nueva Pregunta'}</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>Pregunta:</label>
          <textarea 
            value={formData.question_text}
            onChange={(e) => onFormChange({...formData, question_text: e.target.value})}
            style={{ width: '100%', padding: '0.5rem', minHeight: '80px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Opciones:</label>
          {formData.options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="radio"
                name="correct"
                checked={formData.correct_answer === idx}
                onChange={() => onFormChange({...formData, correct_answer: idx})}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => onOptionChange(idx, e.target.value)}
                placeholder={`Opción ${String.fromCharCode(65 + idx)}`}
                style={{ flex: 1, padding: '0.5rem' }}
              />
              {formData.correct_answer === idx && <span style={{ color: '#10B981' }}>✓ Correcta</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label>Categoría:</label>
            <select 
              value={formData.category_id}
              onChange={(e) => onFormChange({...formData, category_id: e.target.value})}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Dificultad:</label>
            <select 
              value={formData.difficulty}
              onChange={(e) => onFormChange({...formData, difficulty: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value={1}>⭐ Fácil</option>
              <option value={2}>⭐⭐ Medio</option>
              <option value={3}>⭐⭐⭐ Difícil</option>
            </select>
          </div>
          <div>
            <label>XP:</label>
            <input 
              type="number"
              value={formData.xp_reward}
              onChange={(e) => onFormChange({...formData, xp_reward: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={onSave} style={saveButtonStyle}>💾 Guardar</button>
          <button onClick={onCancel} style={cancelButtonStyle}>❌ Cancelar</button>
        </div>
      </div>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={thStyle}>Pregunta</th>
            <th style={thStyle}>Categoría</th>
            <th style={thStyle}>Dif.</th>
            <th style={thStyle}>XP</th>
            <th style={thStyle}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(q => (
            <tr key={q.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={tdStyle}>{q.question_text.substring(0, 60)}...</td>
              <td style={tdStyle}>{q.categories?.name}</td>
              <td style={tdStyle}>{'⭐'.repeat(q.difficulty)}</td>
              <td style={tdStyle}>{q.xp_reward}</td>
              <td style={tdStyle}>
                <button onClick={() => onEdit(q)} style={actionButtonStyle('#3B82F6')}>✏️</button>
                <button onClick={() => onDelete(q.id)} style={actionButtonStyle('#EF4444')}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const AnalyticsTab = ({ stats, analyzeUser }) => (
  <div>
    <h2 style={{ marginBottom: '1rem' }}>🧠 Análisis de IA</h2>
    <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
      Análisis automático de desempeño y recomendaciones personalizadas
    </p>
    
    {stats?.users && Object.entries(stats.users).map(([userId, user]) => {
      const analysis = analyzeUser(userId);
      if (!analysis) return null;
      
      return (
        <div key={userId} style={analysisCardStyle(analysis.score)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>{user.name}</h3>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: analysis.score >= 80 ? '#10B981' : analysis.score >= 60 ? '#F59E0B' : '#EF4444' }}>
              {analysis.score}%
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            <span><strong>Juegos:</strong> {user.totalGames}</span>
            <span><strong>Nivel:</strong> {analysis.level}</span>
          </div>
          
          {analysis.recommendations.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '0.5rem', color: '#374151', fontSize: '0.875rem' }}>💡 Recomendaciones:</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
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

// Estilos
const modalOverlayStyle = {
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
};

const modalContentStyle = {
  background: 'white',
  width: '90%',
  maxWidth: '1200px',
  height: '90%',
  borderRadius: '1rem',
  display: 'flex',
  overflow: 'hidden'
};

const sidebarStyle = {
  width: '250px',
  background: '#1e293b',
  color: 'white',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column'
};

const tabButtonStyle = (active) => ({
  padding: '0.75rem 1rem',
  textAlign: 'left',
  background: active ? '#3B82F6' : 'transparent',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

const closeButtonStyle = {
  marginTop: 'auto',
  padding: '0.75rem',
  background: '#ef4444',
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
    borderLeft: `4px solid ${color}`
  }}>
    <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</h3>
    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: color }}>{value}</p>
  </div>
);

const newButtonStyle = {
  padding: '0.75rem 1.5rem',
  background: '#10B981',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer'
};

const formStyle = {
  background: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  marginBottom: '1rem'
};

const saveButtonStyle = {
  padding: '0.75rem 1.5rem',
  background: '#10B981',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer'
};

const cancelButtonStyle = {
  padding: '0.75rem 1.5rem',
  background: '#6b7280',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer'
};

const thStyle = { padding: '1rem', textAlign: 'left', fontWeight: '600', background: '#f3f4f6' };
const tdStyle = { padding: '1rem' };

const actionButtonStyle = (color) => ({
  padding: '0.5rem',
  marginRight: '0.5rem',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: '0.25rem',
  cursor: 'pointer'
});

const analysisCardStyle = (score) => ({
  background: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  marginBottom: '1rem',
  borderLeft: '4px solid ' + (score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444')
});

export default AdminModal;
