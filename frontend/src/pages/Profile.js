import { useAuthStore } from '../store/authStore';

const Profile = () => {
  const { profile, user } = useAuthStore();

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Mi Perfil</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Gestiona tu cuenta</p>
      
      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '1rem', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Nombre</label>
          <p style={{ fontSize: '1.125rem', fontWeight: '500' }}>{profile?.first_name} {profile?.last_name}</p>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Email</label>
          <p style={{ fontSize: '1.125rem', fontWeight: '500' }}>{profile?.email}</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #E5E7EB' }}>
          <div>
            <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Nivel</label>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3B82F6' }}>{profile?.level}</p>
          </div>
          <div>
            <label style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>XP Total</label>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>{profile?.total_xp}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;