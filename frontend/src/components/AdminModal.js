import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos');
  const [filtroRol, setFiltroRol] = useState('todos');
  
  // Estados para CRUD
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    category_id: '',
    departamento: 'ventas',
    rol: 'asesor',
    difficulty: 1,
    xp_reward: 10
  });

  const departamentos = [
    { id: 'ventas', name: 'Ventas', color: '#3B82F6' },
    { id: 'garantia', name: 'Garantía', color: '#F59E0B' },
    { id: 'atencion', name: 'Atención al Cliente', color: '#10B981' },
    { id: 'seguridad', name: 'Seguridad', color: '#EF4444' }
  ];

  const roles = [
    { id: 'asesor', name: '👨‍💼 Asesor de Ventas' },
    { id: 'gerente', name: '👔 Gerente de Tienda' },
    { id: 'supervisor', name: '👨‍💻 Supervisor' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    
    // Cargar categorías y preguntas en paralelo
    const [{ data: catData }, { data: questionsData }] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('questions').select('*, categories(name)').order('id')
    ]);
    
    setCategories(catData || []);
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
    const deptStats = {};
    
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
      totalGames: sessions.length,
      totalQuestions: questions.length
    });
  };

  // Filtrar preguntas
  const preguntasFiltradas = questions.filter(q => {
    const matchCat = filtroCategoria === 'todas' || q.category_id === filtroCategoria;
    const matchDept = filtroDepartamento === 'todos' || q.departamento === filtroDepartamento;
    const matchRol = filtroRol === 'todos' || q.rol === filtroRol;
    return matchCat && matchDept && matchRol;
  });

  // CRUD Operations
  const newQuestion = () => {
    setEditingQuestion(null);
    setFormData({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      category_id: categories[0]?.id || '',
      departamento: 'ventas',
      rol: 'asesor',
      difficulty: 1,
      xp_reward: 10
    });
    setShowForm(true);
  };

  const editQuestion = (question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      options: [...question.options],
      correct_answer: question.correct_answer,
      category_id: question.category_id,
      departamento: question.departamento || 'ventas',
      rol: question.rol || 'asesor',
      difficulty: question.difficulty,
      xp_reward: question.xp_reward
    });
    setShowForm(true);
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    
    if (editingQuestion) {
      // Actualizar
      const { error } = await supabase
        .from('questions')
        .update(formData)
        .eq('id', editingQuestion.id);
      
      if (!error) {
        setShowForm(false);
        setEditingQuestion(null);
        fetchData();
      } else {
        alert('Error al actualizar: ' + error.message);
      }
    } else {
      // Crear nueva
      const { error } = await supabase
        .from('questions')
        .insert([formData]);
      
      if (!error) {
        setShowForm(false);
        fetchData();
      } else {
        alert('Error al crear: ' + error.message);
      }
    }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);
    
    if (!error) {
      fetchData();
    } else {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const updateOption = (idx, value) => {
    const newOptions = [...formData.options];
    newOptions[idx] = value;
    setFormData({...formData, options: newOptions});
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      category_id: '',
      departamento: 'ventas',
      rol: 'asesor',
      difficulty: 1,
      xp_reward: 10
    });
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
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Sidebar */}
        <div style={sidebarStyle}>
          <h2 style={{ color: 'white', marginBottom: '2rem' }}>⚙️ Admin</h2>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</TabButton>
            <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')}>❓ Preguntas ({preguntasFiltradas.length})</TabButton>
            <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>🧠 Análisis IA</TabButton>
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
                <QuestionsTab 
                  questions={preguntasFiltradas}
                  categories={categories}
                  departamentos={departamentos}
                  roles={roles}
                  filtroCategoria={filtroCategoria}
                  filtroDepartamento={filtroDepartamento}
                  filtroRol={filtroRol}
                  onFiltroCategoria={setFiltroCategoria}
                  onFiltroDepartamento={setFiltroDepartamento}
                  onFiltroRol={setFiltroRol}
                  showForm={showForm}
                  formData={formData}
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
      <StatCard title="Total Sesiones" value={stats?.totalGames || 0} color="#3B82F6" />
      <StatCard title="Usuarios Activos" value={Object.keys(stats?.users || {}).length} color="#10B981" />
      <StatCard title="Preguntas" value={stats?.totalQuestions || 0} color="#F59E0B" />
    </div>
  </div>
);

const QuestionsTab = ({ 
  questions, categories, departamentos, roles,
  filtroCategoria, filtroDepartamento, filtroRol,
  onFiltroCategoria, onFiltroDepartamento, onFiltroRol,
  showForm, formData, editingQuestion, onNew, onEdit, onDelete, onSave, onCancel,
  onFormChange, onOptionChange
}) => (
  <div>
    <h2 style={{ marginBottom: '1rem' }}>❓ Gestión de Preguntas</h2>
    
    {/* Filtros */}
    {!showForm && (
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select value={filtroCategoria} onChange={(e) => onFiltroCategoria(e.target.value)} style={selectStyle}>
          <option value="todas">📁 Todas las categorías</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        
        <select value={filtroDepartamento} onChange={(e) => onFiltroDepartamento(e.target.value)} style={selectStyle}>
          <option value="todos">🏢 Todos los departamentos</option>
          {departamentos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        
        <select value={filtroRol} onChange={(e) => onFiltroRol(e.target.value)} style={selectStyle}>
          <option value="todos">👤 Todos los roles</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        
        <button onClick={onNew} style={newButtonStyle}>+ Nueva Pregunta</button>
      </div>
    )}

    {showForm ? (
      <form onSubmit={onSave} style={formContainerStyle}>
        <h3>{editingQuestion ? '✏️ Editar Pregunta' : '➕ Nueva Pregunta'}</h3>
        
        <div style={formGroupStyle}>
          <label>Pregunta:</label>
          <textarea 
            value={formData.question_text}
            onChange={(e) => onFormChange({...formData, question_text: e.target.value})}
            style={{ width: '100%', padding: '0.5rem', minHeight: '80px' }}
            required
          />
        </div>

        <div style={formGroupStyle}>
          <label>Opciones (marca la correcta):</label>
          {formData.options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <input
                type="radio"
                name="correct_answer"
                checked={formData.correct_answer === idx}
                onChange={() => onFormChange({...formData, correct_answer: idx})}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => onOptionChange(idx, e.target.value)}
                style={{ flex: 1, padding: '0.5rem' }}
                placeholder={`Opción ${String.fromCharCode(65 + idx)}`}
                required
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label>Categoría:</label>
            <select
              value={formData.category_id}
              onChange={(e) => onFormChange({...formData, category_id: e.target.value})}
              style={{ width: '100%', padding: '0.5rem' }}
              required
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label>Departamento:</label>
            <select
              value={formData.departamento}
              onChange={(e) => onFormChange({...formData, departamento: e.target.value})}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              {departamentos.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label>Rol:</label>
            <select
              value={formData.rol}
              onChange={(e) => onFormChange({...formData, rol: e.target.value})}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
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
            <label>XP Recompensa:</label>
            <input
              type="number"
              value={formData.xp_reward}
              onChange={(e) => onFormChange({...formData, xp_reward: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '0.5rem' }}
              min="5"
              max="100"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" style={saveButtonStyle}>
            {editingQuestion ? '💾 Actualizar' : '💾 Guardar'}
          </button>
          <button type="button" onClick={onCancel} style={cancelButtonStyle}>
            ❌ Cancelar
          </button>
        </div>
      </form>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={thStyle}>Pregunta</th>
            <th style={thStyle}>Categoría</th>
            <th style={thStyle}>Depto</th>
            <th style={thStyle}>Rol</th>
            <th style={thStyle}>Dif.</th>
            <th style={thStyle}>XP</th>
            <th style={thStyle}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(q => (
            <tr key={q.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={tdStyle}>{q.question_text.substring(0, 50)}...</td>
              <td style={tdStyle}>{q.categories?.name}</td>
              <td style={tdStyle}>
                <span style={deptBadgeStyle(q.departamento)}>{q.departamento}</span>
              </td>
              <td style={tdStyle}>{q.rol === 'gerente' ? '👔' : q.rol === 'supervisor' ? '👨‍💻' : '🎧'} {q.rol}</td>
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

// ✅ ANALYTICS TAB CON LOADEMPLOYEES CORREGIDO
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
    borderLeft: `4px solid ${color}`
  }}>
    <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</h3>
    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: color }}>{value}</p>
  </div>
);

const selectStyle = {
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  border: '1px solid #e5e7eb',
  background: 'white',
  cursor: 'pointer'
};

const newButtonStyle = {
  padding: '0.75rem 1.5rem',
  background: '#10B981',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  marginLeft: 'auto'
};

const formContainerStyle = {
  background: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  marginBottom: '1rem'
};

const formGroupStyle = {
  marginBottom: '1rem'
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

const deptBadgeStyle = (dept) => ({
  background: {
    ventas: '#3B82F6',
    garantia: '#F59E0B',
    atencion: '#10B981',
    seguridad: '#EF4444'
  }[dept] || '#6b7280',
  color: 'white',
  padding: '0.25rem 0.5rem',
  borderRadius: '0.25rem',
  fontSize: '0.75rem'
});

const analysisCardStyle = (score) => ({
  background: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  marginBottom: '1rem',
  borderLeft: '4px solid ' + (score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444')
});

export default AdminModal;
