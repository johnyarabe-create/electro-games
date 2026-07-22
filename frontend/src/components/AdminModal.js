import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
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
    department_id: '',
    departamento: '',
    rol: 'asesor',
    difficulty: 1,
    xp_reward: 10,
    question_type: 'multiple_choice',
    expected_answer: ''
  });

  // Estados para CRUD categorías
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#3B82F6' });

  // Estados para CRUD departamentos
  const [editingDepto, setEditingDepto] = useState(null);
  const [showDeptoForm, setShowDeptoForm] = useState(false);
  const [deptoForm, setDeptoForm] = useState({ name: '', description: '', color: '#3B82F6' });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    
    const [{ data: catData }, { data: deptoData }, { data: questionsData }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('questions').select('*, categories(name, color)').order('id', { ascending: false })
    ]);
    
    setCategories(catData || []);
    setDepartamentos(deptoData || []);
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

  // FILTRO CORREGIDO
  const preguntasFiltradas = questions.filter(q => {
    const qCategoryId = q.category_id ? String(q.category_id) : '';
    const filterCategory = String(filtroCategoria);
    const qDeptoId = q.department_id ? Number(q.department_id) : null;
    const filterDepto = filtroDepartamento === 'todos' ? 'todos' : Number(filtroDepartamento);
    
    const matchCategoria = filtroCategoria === 'todas' || qCategoryId === filterCategory;
    const matchDepto = filtroDepartamento === 'todos' || qDeptoId === filterDepto;
    const matchRol = filtroRol === 'todos' || q.rol === filtroRol;
    
    return matchCategoria && matchDepto && matchRol;
  });

  // CRUD Preguntas
  const saveQuestion = async () => {
    const questionData = {
      ...formData,
      options: formData.question_type === 'open_text' ? '[]' : JSON.stringify(formData.options),
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
      options: Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]'),
      correct_answer: question.correct_answer,
      category_id: question.category_id || '',
      department_id: question.department_id || '',
      departamento: question.departamento || '',
      rol: question.rol || 'asesor',
      difficulty: question.difficulty || 1,
      xp_reward: question.xp_reward || 10,
      question_type: question.question_type || 'multiple_choice',
      expected_answer: question.expected_answer || ''
    });
    setShowForm(true);
  };

  // CRUD Categorías
  const saveCategory = async () => {
    try {
      if (editingCategory) {
        await supabase.from('categories').update(categoryForm).eq('id', editingCategory.id);
      } else {
        await supabase.from('categories').insert([categoryForm]);
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', color: '#3B82F6' });
      await fetchData();
    } catch (err) {
      alert('Error al guardar categoría');
    }
  };

  const deleteCategory = async (id) => {
    const count = questions.filter(q => String(q.category_id) === String(id)).length;
    if (count > 0) {
      alert(`⚠️ No puedes eliminar esta categoría. Tiene ${count} preguntas.`);
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
  const saveDepto = async () => {
    try {
      if (editingDepto) {
        await supabase.from('departments').update(deptoForm).eq('id', editingDepto.id);
      } else {
        await supabase.from('departments').insert([deptoForm]);
      }
      setShowDeptoForm(false);
      setEditingDepto(null);
      setDeptoForm({ name: '', description: '', color: '#3B82F6' });
      await fetchData();
    } catch (err) {
      alert('Error al guardar departamento');
    }
  };

  const deleteDepto = async (id) => {
    const count = questions.filter(q => Number(q.department_id) === Number(id)).length;
    if (count > 0) {
      alert(`⚠️ No puedes eliminar este departamento. Tiene ${count} preguntas.`);
      return;
    }
    if (!confirm('¿Eliminar este departamento?')) return;
    await supabase.from('departments').delete().eq('id', id);
    fetchData();
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
      department_id: departamentos[0]?.id || '',
      departamento: '',
      rol: 'asesor',
      difficulty: 1,
      xp_reward: 10,
      question_type: 'multiple_choice',
      expected_answer: ''
    });
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
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
                  onNewDepto={() => { setEditingDepto(null); setDeptoForm({ name: '', description: '', color: '#3B82F6' }); setShowDeptoForm(true); }}
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
      <StatCard title="Total Preguntas" value={stats?.totalQuestions || 0} color="#F59E0B" />
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
    <h2 style={{ marginBottom: '1rem' }}>❓ Gestión de Preguntas ({questions.length})</h2>
    
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
              <option value="">Seleccionar...</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label>Departamento:</label>
            <select 
              value={formData.department_id} 
              onChange={(e) => {
                const value = e.target.value;
                const numValue = value ? Number(value) : '';
                onFormChange({...formData, department_id: numValue});
              }} 
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">Seleccionar...</option>
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
          <label>Tipo de pregunta:</label>
          <select 
            value={formData.question_type || 'multiple_choice'} 
            onChange={(e) => onFormChange({...formData, question_type: e.target.value})}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="multiple_choice">📝 Opción múltiple</option>
            <option value="open_text">✏️ Respuesta abierta (análisis)</option>
          </select>
        </div>

        {(formData.question_type || 'multiple_choice') === 'open_text' && (
          <div style={{ marginBottom: '1rem' }}>
            <label>Palabras clave esperadas (separadas por coma):</label>
            <textarea 
              value={formData.expected_answer || ''}
              onChange={(e) => onFormChange({...formData, expected_answer: e.target.value})}
              placeholder="Ej: precio, garantía, calidad, durabilidad"
              style={{ width: '100%', padding: '0.5rem', minHeight: '60px' }}
            />
            <small style={{ color: '#6b7280' }}>El sistema evaluará si la respuesta contiene estas palabras</small>
          </div>
        )}

        {(formData.question_type || 'multiple_choice') === 'multiple_choice' && (
          <div style={{ marginBottom: '1rem' }}>
            <label>Opciones (marca la correcta):</label>
            {formData.options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="radio" name="correct" checked={formData.correct_answer === idx} onChange={() => onFormChange({...formData, correct_answer: idx})} />
                <input type="text" value={opt} onChange={(e) => onOptionChange(idx, e.target.value)} placeholder={`Opción ${String.fromCharCode(65 + idx)}`} style={{ flex: 1, padding: '0.5rem' }} />
                {formData.correct_answer === idx && <span style={{ color: '#10B981' }}>✓ Correcta</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={onSave} style={saveButtonStyle}>💾 Guardar</button>
          <button onClick={onCancel} style={cancelButtonStyle}>❌ Cancelar</button>
        </div>
      </div>
    ) : (
      <>
        {questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <p>No hay preguntas con los filtros seleccionados</p>
            <button onClick={() => { onFiltroCategoria('todas'); onFiltroDepartamento('todos'); onFiltroRol('todos'); }} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
              Ver todas las preguntas
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={thStyle}>Pregunta</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Categoría</th>
                <th style={thStyle}>Depto</th>
                <th style={thStyle}>Rol</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>{q.question_text?.substring(0, 60)}...</td>
                  <td style={tdStyle}>
                    {q.question_type === 'open_text' ? (
                      <span style={{ background: '#F59E0B', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>✏️ Abierta</span>
                    ) : (
                      <span style={{ background: '#3B82F6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>📝 Opción</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: q.categories?.color || '#ccc', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                      {q.categories?.name || 'Sin categoría'}
                    </span>
                  </td>
                  <td style={tdStyle}>{departamentos.find(d => Number(d.id) === Number(q.department_id))?.name || q.departamento || '-'}</td>
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
      </>
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
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>📁 Categorías ({categories.length})</h3>
          {!showCategoryForm && <button onClick={onNewCategory} style={newButtonStyle}>+ Nueva</button>}
        </div>
        
        {showCategoryForm ? (
          <div style={formStyle}>
            <input placeholder="Nombre" value={categoryForm.name} onChange={(e) => onCategoryFormChange({...categoryForm, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
            <input placeholder="Descripción" value={categoryForm.description} onChange={(e) => onCategoryFormChange({...categoryForm, description: e.target.value})} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Color:</label>
              <input type="color" value={categoryForm.color} onChange={(e) => onCategoryFormChange({...categoryForm, color: e.target.value})} style={{ width: '100%', height: '40px' }} />
            </div>
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
                  <small style={{ color: '#6b7280' }}>({questions.filter(q => String(q.category_id) === String(cat.id)).length})</small>
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

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>🏢 Departamentos ({departamentos.length})</h3>
          {!showDeptoForm && <button onClick={onNewDepto} style={newButtonStyle}>+ Nuevo</button>}
        </div>
        
        {showDeptoForm ? (
          <div style={formStyle}>
            <input placeholder="Nombre" value={deptoForm.name} onChange={(e) => onDeptoFormChange({...deptoForm, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
            <input placeholder="Descripción" value={deptoForm.description} onChange={(e) => onDeptoFormChange({...deptoForm, description: e.target.value})} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Color:</label>
              <input type="color" value={deptoForm.color} onChange={(e) => onDeptoFormChange({...deptoForm, color: e.target.value})} style={{ width: '100%', height: '40px' }} />
            </div>
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
                  <small style={{ color: '#6b7280' }}>({questions.filter(q => Number(q.department_id) === Number(depto.id)).length})</small>
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

// ANALYTICS TAB CON 2 BOTONES - CORREGIDO
const AnalyticsTab = ({ stats, questions, categories, departamentos }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [employees, setEmployees] = useState([]);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, department, level, total_xp')
      .order('first_name');
    setEmployees(data || []);
    setShowEmployees(true);
    setShowAnalysis(false);
  };

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
    const stats = {
      totalGames: sessions.length,
      openTextStats: { total: 0, correct: 0, incorrect: 0, byCategory: {}, byDepartment: {}, weakAreas: [] },
      recommendations: []
    };

    sessions.forEach(session => {
      const answers = session.answers || [];
      answers.forEach(answer => {
        const question = allQuestions.find(q => q.id === answer.question_id);
        if (!question) return;

        if (answer.question_type === 'open_text') {
          stats.openTextStats.total++;
          if (answer.is_correct) {
            stats.openTextStats.correct++;
          } else {
            stats.openTextStats.incorrect++;
            const catName = question.categories?.name || 'Sin categoría';
            if (!stats.openTextStats.byCategory[catName]) {
              stats.openTextStats.byCategory[catName] = { errors: 0, total: 0, questions: [] };
            }
            stats.openTextStats.byCategory[catName].errors++;
            stats.openTextStats.byCategory[catName].total++;
            stats.openTextStats.byCategory[catName].questions.push({
              question: question.question_text,
              userAnswer: answer.selected_answer,
              expected: question.expected_answer
            });
          }
        }
      });
    });

    stats.openTextStats.weakAreas = Object.entries(stats.openTextStats.byCategory)
      .map(([category, data]) => ({
        category,
        errorRate: data.total > 0 ? (data.errors / data.total * 100).toFixed(1) : 0,
        totalErrors: data.errors,
        questions: data.questions.slice(0, 3)
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);

    stats.recommendations = generateRecommendations(stats);
    return stats;
  };

  const generateRecommendations = (stats) => {
    const recommendations = [];
    if (stats.openTextStats.weakAreas.length > 0) {
      const top = stats.openTextStats.weakAreas[0];
      if (parseFloat(top.errorRate) > 50) {
        recommendations.push({ priority: '🔴 ALTA', area: top.category, message: `Dificultades en ${top.category} (${top.errorRate}% error)`, action: 'Organizar taller práctico' });
      }
    }
    return recommendations;
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>🧠 Análisis de IA</h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={loadEmployees} style={{ padding: '1rem 2rem', background: showEmployees ? '#3B82F6' : '#10B981', color: 'white', border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
          👥 Ver Empleados ({employees.length})
        </button>
        <button onClick={runAnalysis} disabled={loading} style={{ padding: '1rem 2rem', background: loading ? '#9CA3AF' : (showAnalysis ? '#3B82F6' : '#8B5CF6'), color: 'white', border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '⏳ Analizando...' : '🤖 Ejecutar Análisis IA'}
        </button>
      </div>

      {showEmployees && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>👥 Empleados Registrados ({employees.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {employees.map(emp => (
              <div key={emp.id} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #3B82F6' }}>
                <h4>{emp.first_name} {emp.last_name}</h4>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>📧 {emp.email}</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>🏢 {emp.department || 'Sin departamento'}</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>⭐ Nivel: {emp.level || 1} | 🎯 XP: {emp.total_xp || 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAnalysis && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><p>🤖 Analizando datos...</p></div>
          ) : analysisData ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard title="Precisión" value={`${analysisData.openTextStats.total > 0 ? (analysisData.openTextStats.correct / analysisData.openTextStats.total * 100).toFixed(1) : 0}%`} color="#3B82F6" />
                <StatCard title="Respuestas" value={analysisData.openTextStats.total} color="#10B981" />
                <StatCard title="Áreas Críticas" value={analysisData.openTextStats.weakAreas.length} color="#F59E0B" />
              </div>

              {analysisData.openTextStats.weakAreas.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#EF4444' }}>⚠️ Áreas Débiles</h3>
                  {analysisData.openTextStats.weakAreas.map((area, idx) => (
                    <div key={idx} style={{ background: '#FEE2E2', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', borderLeft: '4px solid #EF4444' }}>
                      <h4>{idx + 1}. {area.category} - {area.errorRate}% error</h4>
                      <p>{area.totalErrors} respuestas incorrectas</p>
                    </div>
                  ))}
                </div>
              )}

              {analysisData.recommendations.length > 0 && (
                <div>
                  <h3 style={{ color: '#3B82F6' }}>💡 Recomendaciones</h3>
                  {analysisData.recommendations.map((rec, idx) => (
                    <div key={idx} style={{ background: rec.priority.includes('🔴') ? '#FEE2E2' : '#FEF3C7', padding: '1rem', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                      <strong>{rec.priority} {rec.area}</strong>
                      <p>{rec.message}</p>
                      <p style={{ color: '#059669' }}>✅ {rec.action}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <p>No hay datos suficientes</p>}
        </>
      )}

      {!showEmployees && !showAnalysis && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>Selecciona una opción para comenzar</p>
        </div>
      )}
    </div>
  );
};

// Estilos
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', width: '90%', maxWidth: '1200px', height: '90%', borderRadius: '1rem', display: 'flex', overflow: 'hidden' };
const sidebarStyle = { width: '250px', background: '#1e293b', color: 'white', padding: '1.5rem', display: 'flex', flexDirection: 'column' };
const tabButtonStyle = (active) => ({ padding: '0.75rem 1rem', textAlign: 'left', background: active ? '#3B82F6' : 'transparent', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' });
const closeButtonStyle = { marginTop: 'auto', padding: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' };
const StatCard = ({ title, value, color }) => <div style={{ background: color + '10', padding: '1.5rem', borderRadius: '0.75rem', borderLeft: `4px solid ${color}` }}><h3 style={{ color: '#6b7280', fontSize: '0.875rem' }}>{title}</h3><p style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</p></div>;
const selectStyle = { padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', minWidth: '180px' };
const newButtonStyle = { padding: '0.75rem 1.5rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' };
const formStyle = { background: '#f9fafb', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1rem' };
const saveButtonStyle = { padding: '0.75rem 1.5rem', background: '#10B981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' };
const cancelButtonStyle = { padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' };
const thStyle = { padding: '1rem', textAlign: 'left', fontWeight: '600', background: '#f3f4f6' };
const tdStyle = { padding: '1rem' };
const actionButtonStyle = (color) => ({ padding: '0.5rem', marginRight: '0.5rem', background: color, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' });

export default AdminModal;
