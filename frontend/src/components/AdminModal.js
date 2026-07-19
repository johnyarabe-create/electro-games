import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departamentos, setDepartamentos] = useState([
    { id: 'ventas', name: 'Ventas', color: '#3B82F6' },
    { id: 'garantia', name: 'Garantía', color: '#F59E0B' },
    { id: 'atencion', name: 'Atención al Cliente', color: '#10B981' },
    { id: 'seguridad', name: 'Seguridad', color: '#EF4444' }
  ]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos');
  const [filtroRol, setFiltroRol] = useState('todos');
  
  // Estados para CRUD preguntas
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

  // Estados para CRUD categorías
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#3B82F6' });

  // Estados para CRUD departamentos
  const [editingDepto, setEditingDepto] = useState(null);
  const [showDeptoForm, setShowDeptoForm] = useState(false);
  const [deptoForm, setDeptoForm] = useState({ id: '', name: '', color: '#3B82F6' });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    
    const [{ data: catData }, { data: questionsData }] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('questions').select('*, categories(name)').order('id')
    ]);
    
    setCategories(catData || []);
    setQuestions(questionsData || []);
    
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

  // Filtrar preguntas
  const preguntasFiltradas = questions.filter(q => {
    const matchCategoria = filtroCategoria === 'todas' || q.category_id === filtroCategoria;
    const matchDepto = filtroDepartamento === 'todos' || q.departamento === filtroDepartamento;
    const matchRol = filtroRol === 'todos' || q.rol === filtroRol;
    return matchCategoria && matchDepto && matchRol;
  });

  // CRUD Preguntas
  const saveQuestion = async () => {
    const questionData = {
      ...formData,
      options: JSON.stringify(formData.options),
      is_active: true
    };

    if (editingQuestion) {
      await supabase.from('questions').update(questionData).eq('id', editingQuestion.id);
    } else {
      await supabase.from('questions').insert([questionData]);
    }

    setShowForm(false);
    setEditingQuestion(null);
    resetForm();
    fetchData();
  };

  const deleteQuestion = async (id) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    await supabase.from('questions').delete().eq('id', id);
    fetchData();
  };

  const editQuestion = (question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      options: Array.isArray(question.options) ? question.options : JSON.parse(question.options),
      correct_answer: question.correct_answer,
      category_id: question.category_id,
      departamento: question.departamento || 'ventas',
      rol: question.rol || 'asesor',
      difficulty: question.difficulty,
      xp_reward: question.xp_reward
    });
    setShowForm(true);
  };

  // CRUD Categorías
  const saveCategory = async () => {
    if (editingCategory) {
      await supabase.from('categories').update(categoryForm).eq('id', editingCategory.id);
    } else {
      await supabase.from('categories').insert([categoryForm]);
    }
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', color: '#3B82F6' });
    fetchData();
  };

  const deleteCategory = async (id) => {
    const count = questions.filter(q => q.category_id === id).length;
    if (count > 0) {
      alert(`No puedes eliminar esta categoría. Tiene ${count} preguntas asignadas.`);
      return;
    }
    if (!confirm('¿Eliminar esta categoría?')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchData();
  };

  const editCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '', color: cat.color || '#3B82F6' });
    setShowCategoryForm(true);
  };

  // CRUD Departamentos
  const saveDepto = () => {
    if (editingDepto) {
      setDepartamentos(prev => prev.map(d => d.id === editingDepto.id ? { ...deptoForm, id: deptoForm.id.toLowerCase().replace(/\s+/g, '_') } : d));
    } else {
      const newId = deptoForm.id.toLowerCase().replace(/\s+/g, '_');
      setDepartamentos(prev => [...prev, { ...deptoForm, id: newId }]);
    }
    setShowDeptoForm(false);
    setEditingDepto(null);
    setDeptoForm({ id: '', name: '', color: '#3B82F6' });
  };

  const deleteDepto = (id) => {
    const count = questions.filter(q => q.departamento === id).length;
    if (count > 0) {
      alert(`No puedes eliminar este departamento. Tiene ${count} preguntas asignadas.`);
      return;
    }
    if (!confirm('¿Eliminar este departamento?')) return;
    setDepartamentos(prev => prev.filter(d => d.id !== id));
  };

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
      departamento: departamentos[0]?.id || 'ventas',
      rol: 'asesor',
      difficulty: 1,
      xp_reward: 10
    });
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const analyzeUser = (userId) => {
    const user = stats?.users[userId];
    if (!user) return null;
    const accuracy = (user.correctAnswers / user.totalQuestions) * 100;
    return {
      score: accuracy.toFixed(1),
      level: accuracy >= 80 ? '⭐⭐⭐ Excelente' : accuracy >= 60 ? '⭐⭐ Bueno' : '⭐ Necesita Mejora',
      recommendations: accuracy < 60 ? ['📚 Reforzar capacitación', '🎯 Practicar más'] : 
                      accuracy < 80 ? ['💡 Mejorar técnica de cierre'] : ['🌟 Mantener excelencia']
    };
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Sidebar */}
        <div style={sidebarStyle}>
          <h2 style={{ marginBottom: '2rem' }}>⚙️ Admin</h2>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</TabButton>
            <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')}>❓ Preguntas</TabButton>
            <TabButton active={activeTab === 'estructura'} onClick={() => setActiveTab('estructura')}>🏗️ Categorías y Deptos</TabButton>
            <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>🧠 Análisis IA</TabButton>
          </nav>
          <button onClick={onClose} style={closeButtonStyle}>✕ Cerrar</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
          {loading ? <div>Cargando...</div> : (
            <>
              {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
              {activeTab === 'questions' && (
                <QuestionsTab 
                  questions={preguntasFiltradas}
                  categories={categories}
                  departamentos={departamentos}
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
              {activeTab === 'estructura' && (
                <EstructuraTab 
                  categories={categories}
                  departamentos={departamentos}
                  questions={questions}
                  showCategoryForm={showCategoryForm}
                  showDeptoForm={showDeptoForm}
                  categoryForm={categoryForm}
                  deptoForm={deptoForm}
                  editingCategory={editingCategory}
                  editingDepto={editingDepto}
                  onNewCategory={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', color: '#3B82F6' }); setShowCategoryForm(true); }}
                  onNewDepto={() => { setEditingDepto(null); setDeptoForm({ id: '', name: '', color: '#3B82F6' }); setShowDeptoForm(true); }}
                  onEditCategory={editCategory}
                  onEditDepto={(d) => { setEditingDepto(d); setDeptoForm({ ...d }); setShowDeptoForm(true); }}
                  onDeleteCategory={deleteCategory}
                  onDeleteDepto={deleteDepto}
                  onSaveCategory={saveCategory}
                  onSaveDepto={saveDepto}
                  onCancelCategory={() => { setShowCategoryForm(false); setEditingCategory(null); }}
                  onCancelDepto={() => { setShowDeptoForm(false); setEditingDepto(null); }}
                  onCategoryFormChange={setCategoryForm}
                  onDeptoFormChange={setDeptoForm}
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

// Sub-componentes (simplificados para el ejemplo)
const TabButton = ({ active, onClick, children }) => (
  <button onClick={onClick} style={tabButtonStyle(active)}>{children}</button>
);

const DashboardTab = ({ stats }) => (
  <div>
    <h2 style={{ marginBottom: '1.5rem' }}>📊 Dashboard</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      <StatCard title="Total Sesiones" value={stats?.totalSessions || 0} color="#3B82F6" />
      <StatCard title="Usuarios" value={Object.keys(stats?.users || {}).length} color="#10B981" />
      <StatCard title="Preguntas" value={stats?.totalQuestions || 0} color="#F59E0B" />
    </div>
  </div>
);

const QuestionsTab = ({ 
  questions, categories, departamentos, filtroCategoria, filtroDepartamento, filtroRol,
  onFiltroCategoria, onFiltroDepartamento, onFiltroRol,
  showForm, formData, editingQuestion, onNew, onEdit, onDelete, onSave, onCancel,
  onFormChange, onOptionChange
}) => (
  <div>
    <h2 style={{ marginBottom: '1rem' }}>❓ Gestión de Preguntas</h2>
    
    {/* Filtros */}
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
        <option value="todos">👥 Todos los roles</option>
        <option value="asesor">🎧 Asesor</option>
        <option value="gerente">👔 Gerente</option>
      </select>
      
      {!showForm && <button onClick={onNew} style={newButtonStyle}>+ Nueva Pregunta</button>}
    </div>

    {showForm ? (
      <div style={formStyle}>
        <h3>{editingQuestion ? '✏️ Editar' : '➕ Nueva'} Pregunta</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>Pregunta:</label>
          <textarea 
            value={formData.question_text}
            onChange={(e) => onFormChange({...formData, question_text: e.target.value})}
            style={{ width: '100%', padding: '0.5rem', minHeight: '60px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label>Categoría:</label>
            <select value={formData.category_id} onChange={(e) => onFormChange({...formData, category_id: e.target.value})} style={{ width: '100%', padding: '0.5rem' }}>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label>Departamento:</label>
            <select value={formData.departamento} onChange={(e) => onFormChange({...formData, departamento: e.target.value})} style={{ width: '100%', padding: '0.5rem' }}>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label>Rol:</label>
            <select value={formData.rol} onChange={(e) => onFormChange({...formData, rol: e.target.value})} style={{ width: '100%', padding: '0.5rem' }}>
              <option value="asesor">🎧 Asesor</option>
              <option value="gerente">👔 Gerente</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Opciones (marca la correcta):</label>
          {formData.options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="radio" name="correct" checked={formData.correct_answer === idx} onChange={() => onFormChange({...formData, correct_answer: idx})} />
              <input type="text" value={opt} onChange={(e) => onOptionChange(idx, e.target.value)} placeholder={`Opción ${String.fromCharCode(65 + idx)}`} style={{ flex: 1, padding: '0.5rem' }} />
              {formData.correct_answer === idx && <span style={{ color: '#10B981' }}>✓</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={onSave} style={saveButtonStyle}>💾 Guardar</button>
          <button onClick={onCancel} style={cancelButtonStyle}>❌ Cancelar</button>
        </div>
      </div>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={thStyle}>Pregunta</th>
            <th style={thStyle}>Categoría</th>
            <th style={thStyle}>Depto</th>
            <th style={thStyle}>Rol</th>
            <th style={thStyle}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {questions.map(q => (
            <tr key={q.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={tdStyle}>{q.question_text.substring(0, 50)}...</td>
              <td style={tdStyle}>{q.categories?.name}</td>
              <td style={tdStyle}><span style={deptoBadgeStyle(q.departamento)}>{q.departamento}</span></td>
              <td style={tdStyle}>{q.rol === 'gerente' ? '👔' : '🎧'} {q.rol}</td>
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

const EstructuraTab = ({ 
  categories, departamentos, questions,
  showCategoryForm, showDeptoForm, categoryForm, deptoForm,
  editingCategory, editingDepto,
  onNewCategory, onNewDepto, onEditCategory, onEditDepto,
  onDeleteCategory, onDeleteDepto, onSaveCategory, onSaveDepto,
  onCancelCategory, onCancelDepto, onCategoryFormChange, onDeptoFormChange
}) => (
  <div>
    <h2 style={{ marginBottom: '1.5rem' }}>🏗️ Categorías y Departamentos</h2>
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      {/* Categorías */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>📁 Categorías de Productos</h3>
          {!showCategoryForm && <button onClick={onNewCategory} style={newButtonStyle}>+ Nueva</button>}
        </div>
        
        {showCategoryForm ? (
          <div style={formStyle}>
            <input 
              placeholder="Nombre de categoría"
              value={categoryForm.name}
              onChange={(e) => onCategoryFormChange({...categoryForm, name: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input 
              placeholder="Descripción"
              value={categoryForm.description}
              onChange={(e) => onCategoryFormChange({...categoryForm, description: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input 
              type="color"
              value={categoryForm.color}
              onChange={(e) => onCategoryFormChange({...categoryForm, color: e.target.value})}
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onSaveCategory} style={saveButtonStyle}>💾 Guardar</button>
              <button onClick={onCancelCategory} style={cancelButtonStyle}>❌ Cancelar</button>
            </div>
          </div>
        ) : (
          <div>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', marginBottom: '0.5rem', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '20px', height: '20px', background: cat.color, borderRadius: '50%' }}></div>
                  <span>{cat.name}</span>
                  <small style={{ color: '#6b7280' }}>({questions.filter(q => q.category_id === cat.id).length} preguntas)</small>
                </div>
                <div>
                  <button onClick={() => onEditCategory(cat)} style={actionButtonStyle('#3B82F6')}>✏️</button>
                  <button onClick={() => onDeleteCategory(cat.id)} style={actionButtonStyle('#EF4444')}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Departamentos */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>🏢 Departamentos</h3>
          {!showDeptoForm && <button onClick={onNewDepto} style={newButtonStyle}>+ Nuevo</button>}
        </div>
        
        {showDeptoForm ? (
          <div style={formStyle}>
            {!editingDepto && (
              <input 
                placeholder="ID (ej: ventas)"
                value={deptoForm.id}
                onChange={(e) => onDeptoFormChange({...deptoForm, id: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
              />
            )}
            <input 
              placeholder="Nombre del departamento"
              value={deptoForm.name}
              onChange={(e) => onDeptoFormChange({...deptoForm, name: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input 
              type="color"
              value={deptoForm.color}
              onChange={(e) => onDeptoFormChange({...deptoForm, color: e.target.value})}
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onSaveDepto} style={saveButtonStyle}>💾 Guardar</button>
              <button onClick={onCancelDepto} style={cancelButtonStyle}>❌ Cancelar</button>
            </div>
          </div>
        ) : (
          <div>
            {departamentos.map(depto => (
              <div key={depto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', marginBottom: '0.5rem', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '20px', height: '20px', background: depto.color, borderRadius: '50%' }}></div>
                  <span>{depto.name}</span>
                  <small style={{ color: '#6b7280' }}>({questions.filter(q => q.departamento === depto.id).length} preguntas)</small>
                </div>
                <div>
                  <button onClick={() => onEditDepto(depto)} style={actionButtonStyle('#3B82F6')}>✏️</button>
                  <button onClick={() => onDeleteDepto(depto.id)} style={actionButtonStyle('#EF4444')}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

const AnalyticsTab = ({ stats, analyzeUser }) => (
  <div>
    <h2 style={{ marginBottom: '1rem' }}>🧠 Análisis de IA</h2>
    {stats?.users && Object.entries(stats.users).map(([userId, user]) => {
      const analysis = analyzeUser(userId);
      if (!analysis) return null;
      return (
        <div key={userId} style={analysisCardStyle(analysis.score)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{user.name}</h3>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: analysis.score >= 80 ? '#10B981' : analysis.score >= 60 ? '#F59E0B' : '#EF4444' }}>{analysis.score}%</span>
          </div>
          <p><strong>{analysis.level}</strong> | Juegos: {user.totalGames}</p>
          {analysis.recommendations.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0 1.25rem', fontSize: '0.875rem' }}>
              {analysis.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
            </ul>
          )}
        </div>
      );
    })}
  </div>
);

// Estilos
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', width: '90%', maxWidth: '1200px', height: '90%', borderRadius: '1rem', display: 'flex', overflow: 'hidden' };
const sidebarStyle = { width: '250px', background: '#1e293b', color: 'white', padding: '1.5rem', display: 'flex', flexDirection: 'column' };
const tabButtonStyle = (active) => ({ padding: '0.75rem 1rem', textAlign: 'left', background: active ? '#3B82F6' : 'transparent', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' });
const closeButtonStyle = { marginTop: 'auto', padding: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' };
const StatCard = ({ title, value, color }) => <div style={{ background: color + '10', padding: '1.5rem', borderRadius: '0.75rem', borderLeft: `4px solid ${color}` }}><h3 style={{ color: '#6b7280', fontSize: '0.875rem' }}>{title}</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</p></div>;
const selectStyle = { padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', minWidth: '150px' };
const newButtonStyle = { padding: '0.75rem 1.5rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' };
const formStyle = { background: '#f9fafb', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1rem' };
const saveButtonStyle = { padding: '0.75rem 1.5rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' };
const cancelButtonStyle = { padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' };
const thStyle = { padding: '1rem', textAlign: 'left', fontWeight: '600', background: '#f3f4f6' };
const tdStyle = { padding: '1rem' };
const actionButtonStyle = (color) => ({ padding: '0.5rem', marginRight: '0.5rem', background: color, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' });
const deptoBadgeStyle = (depto) => ({ background: {ventas: '#3B82F6', garantia: '#F59E0B', atencion: '#10B981', seguridad: '#EF4444'}[depto] || '#6b7280', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', textTransform: 'capitalize' });
const analysisCardStyle = (score) => ({ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1rem', borderLeft: '4px solid ' + (score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444') });

export default AdminModal;
