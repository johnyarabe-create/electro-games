import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

const Game = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuthStore();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Cargar configuración
    const savedConfig = localStorage.getItem('gameConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    } else {
      // Configuración por defecto
      setConfig({
        category: 'todas',
        departamento: 'todos',
        difficulty: 'todas',
        questionCount: 10
      });
    }
  }, []);

  useEffect(() => {
    if (config) {
      fetchQuestions();
    }
  }, [config]);

  const fetchQuestions = async () => {
    setLoading(true);
    
    let query = supabase
      .from('questions')
      .select('*, categories(name, color)')
      .eq('is_active', true);

    // Aplicar filtros
    if (config.category !== 'todas') {
      query = query.eq('category_id', config.category);
    }
    
    if (config.departamento !== 'todos') {
      query = query.eq('departamento', config.departamento);
    }
    
    if (config.difficulty !== 'todas') {
      query = query.eq('difficulty', parseInt(config.difficulty));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error:', error);
      return;
    }

    // Mezclar y limitar cantidad
    const shuffled = data.sort(() => 0.5 - Math.random());
    const limited = shuffled.slice(0, config.questionCount || 10);
    
    setQuestions(limited);
    setLoading(false);
  };

  const handleAnswer = async (index) => {
    if (selected !== null) return;
    setSelected(index);
    
    const currentQ = questions[current];
    const isCorrect = index === currentQ.correct_answer;
    
    setTimeout(async () => {
      const newAnswers = [...answers, {
        question_id: currentQ.id,
        selected_answer: index,
        is_correct: isCorrect,
        xp_earned: isCorrect ? currentQ.xp_reward : 0
      }];
      
      setAnswers(newAnswers);
      
      if (current < questions.length - 1) {
        setCurrent(current + 1);
        setSelected(null);
      } else {
        await finishGame(newAnswers);
      }
    }, 1000);
  };

  const finishGame = async (finalAnswers) => {
    const correctCount = finalAnswers.filter(a => a.is_correct).length;
    const totalXP = finalAnswers.reduce((sum, a) => sum + a.xp_earned, 0);
    
    // Guardar sesión
    await supabase.from('game_sessions').insert([{
      user_id: profile.id,
      score: correctCount * 100,
      correct_answers: correctCount,
      total_questions: finalAnswers.length,
      xp_earned: totalXP,
      completed: true
    }]);
    
    // Actualizar XP
    const newTotalXP = (profile.total_xp || 0) + totalXP;
    const newCurrentXP = (profile.current_xp || 0) + totalXP;
    const xpForNextLevel = Math.round(100 * Math.pow((profile.level || 1) + 1, 1.5));
    const newLevel = newCurrentXP >= xpForNextLevel ? (profile.level || 1) + 1 : (profile.level || 1);
    const remainingXP = newCurrentXP >= xpForNextLevel ? newCurrentXP - xpForNextLevel : newCurrentXP;
    
    await updateProfile({
      total_xp: newTotalXP,
      current_xp: remainingXP,
      level: newLevel
    });
    
    setResults({
      correct_answers: correctCount,
      total_questions: finalAnswers.length,
      xp_earned: totalXP
    });
    
    setFinished(true);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando preguntas...</div>;

  if (finished) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ marginBottom: '1rem' }}>¡Juego Completado!</h2>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', maxWidth: '400px', margin: '0 auto' }}>
          <p style={{ fontSize: '1.25rem' }}>Correctas: <strong>{results.correct_answers}/{results.total_questions}</strong></p>
          <p style={{ fontSize: '1.25rem', color: '#10B981', fontWeight: 'bold' }}>+{results.xp_earned} XP</p>
        </div>
        <button onClick={() => navigate('/')} style={{ marginTop: '2rem', padding: '1rem 2rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
          Volver al Inicio
        </button>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Mostrar filtros aplicados */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
        <small>
          🎮 Modo: {config?.departamento === 'todos' ? 'Todos los departamentos' : config?.departamento} | 
          📁 {config?.category === 'todas' ? 'Todas las categorías' : q?.categories?.name} | 
          Pregunta {current + 1} de {questions.length}
        </small>
      </div>
      
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            Pregunta {current + 1} de {questions.length}
          </span>
          <span style={{ background: q?.categories?.color || '#3B82F6', color: 'white', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.875rem' }}>
            {q?.categories?.name}
          </span>
        </div>
        
        <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>{q?.question_text}</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {q?.options?.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={selected !== null}
              style={{
                padding: '1.25rem',
                textAlign: 'left',
                borderRadius: '0.75rem',
                border: '2px solid',
                borderColor: selected === null ? '#e5e7eb' : selected === idx ? (idx === q.correct_answer ? '#10B981' : '#EF4444') : (idx === q.correct_answer ? '#10B981' : '#e5e7eb'),
                background: selected === null ? 'white' : selected === idx ? (idx === q.correct_answer ? '#D1FAE5' : '#FEE2E2') : (idx === q.correct_answer ? '#D1FAE5' : '#F9FAFB'),
                cursor: selected === null ? 'pointer' : 'default',
                fontSize: '1.125rem'
              }}
            >
              <strong style={{ marginRight: '1rem', color: '#3B82F6' }}>{String.fromCharCode(65 + idx)}.</strong>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Game;
