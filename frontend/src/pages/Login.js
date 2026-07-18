import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.firstName, form.lastName);
        alert('Registro exitoso. Verifica tu email si es necesario.');
        setIsLogin(true);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' 
    }}>
      <div style={{ 
        background: 'white', 
        padding: '2.5rem', 
        borderRadius: '1rem', 
        width: '100%', 
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1E40AF' }}>
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>
        
        {error && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#dc2626', 
            padding: '0.75rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input 
                type="text" 
                placeholder="Nombre" 
                value={form.firstName} 
                onChange={(e) => setForm({...form, firstName: e.target.value})} 
                required 
                style={{ width: '100%', padding: '0.875rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '1rem' }} 
              />
              <input 
                type="text" 
                placeholder="Apellido" 
                value={form.lastName} 
                onChange={(e) => setForm({...form, lastName: e.target.value})} 
                required 
                style={{ width: '100%', padding: '0.875rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '1rem' }} 
              />
            </>
          )}
          <input 
            type="email" 
            placeholder="Email" 
            value={form.email} 
            onChange={(e) => setForm({...form, email: e.target.value})} 
            required 
            style={{ width: '100%', padding: '0.875rem', marginBottom: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '1rem' }} 
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={form.password} 
            onChange={(e) => setForm({...form, password: e.target.value})} 
            required 
            style={{ width: '100%', padding: '0.875rem', marginBottom: '1.25rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '1rem' }} 
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '0.875rem', 
              background: loading ? '#93C5FD' : '#3B82F6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.5rem', 
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            {loading ? 'Procesando...' : (isLogin ? 'Entrar' : 'Registrarse')}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280' }}>
          {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#3B82F6', 
              cursor: 'pointer',
              fontWeight: '600',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;