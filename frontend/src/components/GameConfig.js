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

  useEffect(() => {
    fetchFilters();
    // Cargar configuración guardada si existe
    const savedConfig = localStorage.getItem('gameConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setSelectedCategory(config.category || 'all');
      setSelectedDepartment(config.department || 'all');
    }
  }, []);

  const fetchFilters = async () => {
    try {
      const [{ data: cats }, { data: depts }] = await Promise.all([
        supabase.from('categories').select('id, name').eq('is_active', true),
        supabase.from('departments').select('id, name').eq('is_active', true)
      ]);
      setCategories(cats || []);
      setDepartments(depts || []);
    } catch (error) {
      console.error('Error cargando filtros:', error);
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
        Cargando opciones...
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
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
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
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
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
          Categoría: {selectedCategory === 'all' ? 'Todas' : categories.find(c => c.id === selectedCategory)?.name}<br />
          Departamento: {selectedDepartment === 'all' ? 'Todos' : departments.find(d => d.id === selectedDepartment)?.name}
        </div>

        <button
          onClick={handleStartGame}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontSize: '1.125rem',
            fontWeight: '600',
            cursor: 'pointer',
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
    </div>
  );
};

export default GameConfig;
