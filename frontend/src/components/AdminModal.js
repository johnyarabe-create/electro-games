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
    
    // Cargar estadísticas
    const { data: sessionsData } = await supabase
      .from('game_sessions')
      .select('*, profiles(first_name, last_name)');
    
    setQuestions(questionsData || []);
    calculateStats(sessionsData || []);
    setLoading(false);
  };

  const calculateStats = (sessions) => {
    const categoryStats = {};
    const userStats = {};
    
    sessions.forEach(session => {
      // Estadísticas por usuario
      if (!userStats[session.user_id]) {
        userStats[session.user_id] = {
          name: session.profiles?.first_name + ' ' + session.profiles?.last_name || 'Anónimo',
          totalGames: 0,
          correctAnswers: 0,
          totalAnswers: 0,
          totalXP: 0
        };
      }
      
      userStats[session.user_id].totalGames++;
      userStats[session.user_id].correctAnswers += session.correct_answers || 0;
      userStats[session.user_id].totalAnswers += session.total_questions || 0;
      userStats[session.user_id].totalXP += session.xp_earned || 0;
    });

    setStats({
      users: userStats,
      totalGames: sessions.length
    });
  };

  // CRUD Operations
  const handleCreate = async (e) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('questions')
      .insert([formData]);
    
    if (!error) {
      setShowForm(false);
      resetForm();
      fetchData();
    } else {
      console.error('Error creating question:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('questions')
      .update(formData)
      .eq('id', editingQuestion.id);
    
    if (!error) {
      setShowForm(false);
      setEditingQuestion(null);
      resetForm();
      fetchData();
    } else {
      console.error('Error updating question:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);
    
    if (!error) {
      fetchData();
    } else {
      console.error('Error deleting question:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      category_id: '',
      difficulty: 1,
      xp_reward: 10
    });
  };

  const startEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      options: [...question.options],
      correct_answer: question.correct_answer,
      category_id: question.category_id,
      difficulty: question.difficulty,
      xp_reward: question.xp_reward
    });
    setShowForm(true);
  };

  // Análisis de usuario
  const analyzeUser = (userId) => {
    const user = stats?.users?.[userId];
    if (!user) return null;
    
    const accuracy = user.totalAnswers > 0 
      ? Math.round((user.correctAnswers / user.totalAnswers) * 100) 
      : 0;
    
    let level = 'Novato';
    if (accuracy >= 80) level = 'Experto';
    else if (accuracy >= 60) level = 'Intermedio';
    
    const recommendations = [];
    if (accuracy < 60) {
      recommendations.push('Repasar conceptos básicos de producto');
      recommendations.push('Practicar técnicas de venta');
    }
    if (user.totalGames < 5) {
      recommendations.push('Jugar más partidas para ganar experiencia');
    }
    
    return { score: accuracy, level, recommendations };
  };

  if (!isOpen) return null;

  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        width: '90%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>⚙️ Panel de Administración</h1>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '1rem' }}>
          <button onClick={() => setActiveTab('dashboard')} style={tabStyle(activeTab === 'dashboard')}>
            📊 Dashboard
          </button>
          <button onClick={() => setActiveTab('questions')} style={tabStyle(activeTab === 'questions')}>
            📝 Preguntas
          </button>
          <button onClick={() => setActiveTab('analytics')} style={tabStyle(activeTab === 'analytics')}>
            🧠 Análisis
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div>Cargando...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardTab stats={stats} />
            )}
            {activeTab === 'questions' && (
              <QuestionsTab 
                questions={questions}
                categories={categories}
                showForm={showForm}
                setShowForm={setShowForm}
                formData={formData}
                setFormData={setFormData}
                editingQuestion={editingQuestion}
                setEditingQuestion={setEditingQuestion}
                handleCreate={handleCreate}
                handleUpdate={handleUpdate}
                handleDelete={handleDelete}
                startEdit={startEdit}
                resetForm={resetForm}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsTab stats={stats} analyzeUser={analyzeUser} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Sub-components
const DashboardTab = ({ stats }) => (
  <div>
    <h2 style={{ marginBottom: '1.5rem' }}>📊 Estadísticas Generales</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <StatCard title="Total Partidas" value={stats?.totalGames || 0} color="#3B82F6" />
      <StatCard title="Jugadores Activos" value={Object.keys(stats?.users || {}).length} color="#10B981" />
    </div>
    
    <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>🏆 Top Jugadores</h3>
    <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
      {stats?.users && Object.entries(stats.users)
        .sort(([,a], [,b]) => b.totalXP - a.totalXP)
        .slice(0, 5)
        .map(([id, user], idx) => (
          <div key={id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '0.75rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <span>#{idx + 1} {user.name}</span>
            <span style={{ fontWeight: 'bold', color: '#3B82F6' }}>{user.totalXP} XP</span>
          </div>
        ))}
    </div>
  </div>
);

const QuestionsTab = ({
  questions,
  categories,
  showForm,
  setShowForm,
  formData,
  setFormData,
  editingQuestion,
  setEditingQuestion,
  handleCreate,
  handleUpdate,
  handleDelete,
  startEdit,
  resetForm
}) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h2>📝 Gestión de Preguntas</h2>
      <button 
        onClick={() => {
          setEditingQuestion(null);
          resetForm();
          setShowForm(!showForm);
        }}
        style={{
          padding: '0.75rem 1.5rem',
          background: showForm ? '#6b7280' : '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer'
        }}
      >
        {showForm ? 'Cancelar' : '+ Nueva Pregunta'}
      </button>
    </div>

    {showForm && (
      <form onSubmit={editingQuestion ? handleUpdate : handleCreate} style={{
        background: '#f9fafb',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Pregunta:</label>
          <textarea
            value={formData.question_text}
            onChange={(e) => setFormData({...formData, question_text: e.target.value})}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }}
            rows={3}
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Opciones:</label>
          {formData.options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="radio"
                name="correct"
                checked={formData.correct_answer === idx}
                onChange={() => setFormData({...formData, correct_answer: idx})}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOptions = [...formData.options];
                  newOptions[idx] = e.target.value;
                  setFormData({...formData, options: newOptions});
                }}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }}
                placeholder={`Opción ${String.fromCharCode(65 + idx)}`}
                required
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Categoría:</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }}
              required
            >
              <option value="">Seleccionar...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Dificultad:</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }}
            >
              <option value={1}>⭐ Fácil</option>
              <option value={2}>⭐⭐ Medio</option>
              <option value={3}>⭐⭐⭐ Difícil</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" style={saveButtonStyle}>
            {editingQuestion ? '💾 Actualizar' : '💾 Guardar'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              setShowForm(false);
              setEditingQuestion(null);
              resetForm();
            }}
            style={cancelButtonStyle}
          >
            ❌ Cancelar
          </button>
        </div>
      </form>
    )}

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
              <button onClick={() => startEdit(q)} style={actionButtonStyle('#3B82F6')}>✏️</button>
              <button onClick={() => handleDelete(q.id)} style={actionButtonStyle('#EF4444')}>🗑️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ✅ ANALYTICS TAB CORREGIDO - SIN COLUMNA 'DEPARTMENT'
const AnalyticsTab = ({ stats, analyzeUser }) => {
  const [showEmployees, setShowEmployees] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState(null);

  // Cargar empleados - CORREGIDO: sin 'department'
  const loadEmployees = async () => {
    console.log('🔵 Cargando empleados...');
    setLoadingEmployees(true);
    setEmployeeError(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, level, total_xp')
        .order('first_name');
      
      if (error) {
        console.error('❌ Error:', error);
        setEmployeeError(error.message);
        setLoadingEmployees(false);
        return;
      }
      
      console.log('✅ Datos recibidos:', data);
      setEmployees(data || []);
      setShowEmployees(true);
    } catch (err) {
      console.error('❌ Error inesperado:', err);
      setEmployeeError(err.message);
    } finally {
      setLoadingEmployees(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>🧠 Análisis de Desempeño</h2>
      
      {/* Botón para cargar empleados */}
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={loadEmployees}
          disabled={loadingEmployees}
          style={{
            padding: '1rem 2rem',
            background: loadingEmployees ? '#9ca3af' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: loadingEmployees ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
        >
          {loadingEmployees ? '⏳ Cargando...' : '👥 Ver Empleados'}
        </button>
      </div>

      {/* Error message */}
      {employeeError && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          ⚠️ Error: {employeeError}
        </div>
      )}

      {/* Lista de empleados */}
      {showEmployees && !loadingEmployees && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>👥 Empleados Registrados ({employees.length})</h3>
          {employees.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No hay empleados registrados</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Nivel</th>
                  <th style={thStyle}>XP Total</th>
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
          )}
        </div>
      )}

      {/* Análisis por usuario */}
      <h3 style={{ marginBottom: '1rem' }}>📊 Análisis Individual</h3>
      {stats?.users && Object.entries(stats.users).map(([userId, user]) => {
        const analysis = analyzeUser(userId);
        if (!analysis) return null;
        
        return (
          <div key={userId} style={analysisCardStyle(analysis.score)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{user.name}</h3>
              <span style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: analysis.score >= 80 ? '#10B981' : analysis.score >= 60 ? '#F59E0B' : '#EF4444' 
              }}>
                {analysis.score}%
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <span>🎮 <strong>{user.totalGames}</strong> partidas</span>
              <span>✅ <strong>{user.correctAnswers}</strong> correctas</span>
              <span>⭐ <strong>{user.totalXP}</strong> XP</span>
              <span>🏆 Nivel: <strong>{analysis.level}</strong></span>
            </div>
            
            {analysis.recommendations.length > 0 && (
              <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem' }}>
                <strong>💡 Recomendaciones:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.25rem', fontSize: '0.875rem' }}>
                  {analysis.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Styles
const tabStyle = (active) => ({
  padding: '0.75rem 1.5rem',
  background: active ? '#3B82F6' : 'transparent',
  color: active ? 'white' : '#374151',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  fontWeight: active ? 'bold' : 'normal'
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

const analysisCardStyle = (score) => ({
  background: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  marginBottom: '1rem',
  borderLeft: '4px solid ' + (score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444')
});

export default AdminModal;
