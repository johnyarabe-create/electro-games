import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const GameConfig = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    fetchFilters();
    // Cargar configuración guardada si existe
    const savedConfig = localStorage.getItem('gameConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setSelectedCategory(config.category || 'all');
        setSelectedDepartment(config.department || 'all');
      } catch (e) {
        console.error('Error parsing saved config:', e);
      }
    }
  }, []);

  const fetchFilters = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('Cargando...');
    
    try {
      // Consultar categorías
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (catsError) {
        throw new Error(`Error categorías: ${catsError.message}`);
      }
      
      // Consultar departamentos
      const { data: depts, error: deptsError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (deptsError) {
        throw new Error(`Error departamentos: ${deptsError.message}`);
      }
      
      console.log('Categorías cargadas:', cats);
      console.log('Departamentos cargados:', depts);
      
      setDebugInfo(`Categorías: ${cats?.length || 0}, Departamentos: ${depts?.length || 0}`);
      setCategories(cats || []);
      setDepartments(depts || []);
      
    } catch (err) {
      console.error('Error completo:', err);
      setError(err.message);
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    const config = {
      category: selectedCategory,
      department: selectedDepartment,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('gameConfig', JSON.stringify(config));
    navigate('/game');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Cargando opciones...</p>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{debugInfo}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#EF4444' }}>⚠️ Error al cargar</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{error}</p>
        <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2rem' }}>
          Verifica que las tablas 'categories' y 'departments' existan en Supabase y tengan registros con is_active = true
        </p>
        <button
          onClick={fetchFilters}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          🔄 Reintentar
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            marginLeft: '1rem',
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            color: '#6b7280',
            border: '2px solid #e5e7eb',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Configurar Juego</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Selecciona las preguntas que quieres practicar
      </p>

      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        {/* Selector de Categoría */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            📦 Categoría de Producto
            <span style={{ 
              marginLeft: '0.5rem', 
              fontSize: '0.75rem', 
              color: categories.length === 0 ? '#EF4444' : '#10B981',
              fontWeight: 'normal'
            }}>
              {categories.length === 0 ? '(No hay categorías)' : `(${categories.length} disponibles)`}
            </span>
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '2px solid',
              borderColor: categories.length === 0 ? '#EF4444' : '#e5e7eb',
              fontSize: '1rem',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {categories.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.5rem' }}>
              ⚠️ No se encontraron categorías activas en la base de datos
            </p>
          )}
        </div>

        {/* Selector de Departamento */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            🏢 Departamento
            <span style={{ 
              marginLeft: '0.5rem', 
              fontSize: '0.75rem', 
              color: departments.length === 0 ? '#EF4444' : '#10B981',
              fontWeight: 'normal'
            }}>
              {departments.length === 0 ? '(No hay departamentos)' : `(${departments.length} disponibles)`}
            </span>
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '2px solid',
              borderColor: departments.length === 0 ? '#EF4444' : '#e5e7eb',
              fontSize: '1rem',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">Todos los departamentos</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          {departments.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.5rem' }}>
              ⚠️ No se encontraron departamentos activos en la base de datos
            </p>
          )}
        </div>

        {/* Resumen de selección */}
        <div style={{ 
          background: '#F3F4F6', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <strong>Configuración seleccionada:</strong><br />
          Categoría: {selectedCategory === 'all' ? 'Todas' : categories.find(c => c.id === selectedCategory)?.name || 'N/A'}<br />
          Departamento: {selectedDepartment === 'all' ? 'Todos' : departments.find(d => d.id === selectedDepartment)?.name || 'N/A'}
        </div>

        <button
          onClick={handleStartGame}
          disabled={categories.length === 0 && departments.length === 0}
          style={{
            width: '100%',
            padding: '1rem',
            background: (categories.length === 0 && departments.length === 0) ? '#9CA3AF' : 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontSize: '1.125rem',
            fontWeight: '600',
            cursor: (categories.length === 0 && departments.length === 0) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
          }}
        >
          ▶️ Iniciar Juego
        </button>
      </div>

      <button
        onClick={() => navigate('/')}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'transparent',
          color: '#6b7280',
          border: '2px solid #e5e7eb',
          borderRadius: '0.75rem',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
      >
        ← Volver al Dashboard
      </button>

      {/* Debug info */}
      <p style={{ fontSize: '0.625rem', color: '#9CA3AF', textAlign: 'center', marginTop: '1rem' }}>
        {debugInfo}
      </p>
    </div>
  );
};

export default GameConfig;
