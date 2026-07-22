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
  const [textAnswer, setTextAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState(null);
  const [config, setConfig] = useState({ category: 'all', department: 'all' });
  const [noQuestions, setNoQuestions] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('gameConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        fetchQuestions(parsedConfig);
      } catch (e) {
        console.error('Error parsing config:', e);
        fetchQuestions({ category: 'all', department: 'all' });
      }
    } else {
      fetchQuestions({ category: 'all', department: 'all' });
    }
  }, []);

  const fetchQuestions = async (gameConfig) => {
    setLoading(true);
    setNoQuestions(false);
    
    try {
      let query = supabase
        .from('questions')
        .select('*, categories(name, color)')
        .eq('is_active', true);
      
      if (gameConfig?.category && gameConfig.category !== 'all') {
        query = query.eq('category_id', gameConfig.category);
      }
      
      if (gameConfig?.department && gameConfig.department !== 'all') {
        query = query.eq('department_id', gameConfig.department);
      }
      
      const { data, error } = await query.order('id', { ascending: false });
      
      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }
      
      if (!data || data.length === 0) {
        setNoQuestions(true);
        setQuestions([]);
        setLoading(false);
        return;
      }
      
      const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 10);
      setQuestions(shuffled);
      
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer) => {
    if (selected !== null) return;
    setSelected(answer);
    
    const currentQ = questions[current];
    let isCorrect = false;
    
    if (currentQ.question_type === 'open_text') {
      // Evaluar respuesta abierta por palabras clave
      const userAnswer = String(answer).toLowerCase().trim();
      const keywords = (currentQ.expected_answer || '').toLowerCase().split(',').map(k => k.trim()).filter(k => k);
      isCorrect = keywords.length > 0 && keywords.some(keyword => userAnswer.includes(keyword));
      
      console.log('Respuesta abierta evaluada:', {
        userAnswer,
        keywords,
        isCorrect,
        expected: currentQ.expected_answer
      });
    } else {
      // Opción múltiple
      isCorrect = answer === currentQ.correct_answer;
    }
    
    setTimeout(async () => {
      const newAnswers = [...answers, {
        question_id: currentQ.id,
        selected_answer: answer,
        is_correct: isCorrect,
        xp_earned: isCorrect ? currentQ.xp_reward : 0,
        question_type: currentQ.question_type || 'multiple_choice'
      }];
      
      setAnswers(newAnswers);
      
      if (current < questions.length - 1) {
        setCurrent(current + 1);
        setSelected(null);
        setTextAnswer('');
      } else {
        await finishGame(newAnswers);
      }
    }, 1000);
  };

  const finishGame = async (finalAnswers) => {
    const correctCount = finalAnswers.filter(a => a.is_correct).length;
    const totalXP = finalAnswers.reduce((sum, a) => sum + a.xp_earned, 0);
    
    // Guardar sesión de juego
    await supabase.from('game_sessions').insert([{
      user_id: profile.id,
      score: correctCount * 100,
      correct_answers: correctCount,
      total_questions: finalAnswers.length,
      xp_earned: totalXP,
      completed: true,
      answers: finalAnswers
    }]);
    
    // Actualizar XP y nivel del usuario
    const newTotalXP = (profile.total_xp || 0) + totalXP;
    const newCurrentXP = (profile.current_xp || 0) + totalXP;
    const xpForNextLevel = Math.round(100 * Math.pow((profile.level || 1) + 1, 1.5));
    const newLevel = newCurrentXP >= xpForNextLevel ? (profile.level || 1) + 1 : (profile.level || 1);
    const remainingXP = newCurrentXP >= xpForNextLevel ? newCurrentXP - xpForNextLevel : newCurrentXP;
    
    await updateProfile({
      total_xp: newTotalXP,
      current_xp: remainingXP,
      level: newLevel,
      streak_days: (profile.streak_days || 0) + 1
    });
    
    setResults({
      correct_answers: correctCount,
      total_questions: finalAnswers.length,
      xp_earned: totalXP
    });
    
    setFinished(true);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Cargando preguntas...</p>
      </div>
    );
  }

  if (noQuestions) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😕</div>
        <h2 style={{ marginBottom: '1rem', color: '#EF4444' }}>No hay preguntas disponibles</h2>
        <button onClick={() => navigate('/game-config')} style={{ padding: '1rem 2rem', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
          Cambiar Filtros
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ marginBottom: '1rem' }}>¡Juego Completado!</h2>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', maxWidth: '400px', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Correctas: <strong>{results.correct_answers}/{results.total_questions}</strong>
          </p>
          <p style={{ fontSize: '1.25rem', color: '#10B981', fontWeight: 'bold' }}>
            +{results.xp_earned} XP
          </p>
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
      {/* Indicadores */}
      {(config.category !== 'all' || config.department !== 'all') && (
        <div style={{ background: '#DBEAFE', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: '#1E40AF' }}>
            <strong>Filtros:</strong>{' '}
            {config.category !== 'all' && `Categoría: ${config.category}`}
            {config.category !== 'all' && config.department !== 'all' && ' | '}
            {config.department !== 'all' && `Depto: ${config.department}`}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.125rem', color: '#6b7280' }}>
          Pregunta {current + 1} de {questions.length}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ background: q?.categories?.color || '#3B82F6', color: 'white', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '600' }}>
            {q?.categories?.name || 'General'}
          </span>
          {q?.question_type === 'open_text' && (
            <span style={{ background: '#F59E0B', color: 'white', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '600' }}>
              ✏️ Respuesta abierta
            </span>
          )}
        </div>
      </div>
      
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', lineHeight: '1.5' }}>
          {q?.question_text}
        </h2>
        
        {q?.question_type === 'open_text' ? (
          // RESPUESTA ABIERTA
          <div style={{ marginBottom: '2rem' }}>
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              disabled={selected !== null}
              style={{
                width: '100%',
                padding: '1rem',
                minHeight: '120px',
                borderRadius: '0.75rem',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <button
              onClick={() => handleAnswer(textAnswer)}
              disabled={!textAnswer.trim() || selected !== null}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 2rem',
                background: textAnswer.trim() ? '#3B82F6' : '#9CA3AF',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: textAnswer.trim() ? 'pointer' : 'not-allowed',
                fontSize: '1rem'
              }}
            >
              Enviar Respuesta
            </button>
            
            {selected !== null && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                background: selected ? '#D1FAE5' : '#FEE2E2',
                border: '2px solid',
                borderColor: selected ? '#10B981' : '#EF4444'
              }}>
                <p><strong>Tu respuesta:</strong> {selected}</p>
                <p><strong>Palabras clave esperadas:</strong> {q?.expected_answer}</p>
                <p style={{ color: selected ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                  {selected ? '✅ Correcto' : '❌ Incorrecto'}
                </p>
              </div>
            )}
          </div>
        ) : (
          // OPCIÓN MÚLTIPLE
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
                  borderColor: selected === null ? '#e5e7eb' : 
                    selected === idx ? 
                      (idx === q.correct_answer ? '#10B981' : '#EF4444') : 
                      (idx === q.correct_answer ? '#10B981' : '#e5e7eb'),
                  background: selected === null ? 'white' : 
                    selected === idx ? 
                      (idx === q.correct_answer ? '#D1FAE5' : '#FEE2E2') : 
                      (idx === q.correct_answer ? '#D1FAE5' : '#F9FAFB'),
                  cursor: selected === null ? 'pointer' : 'default',
                  fontSize: '1.125rem',
                  transition: 'all 0.2s'
                }}
              >
                <strong style={{ marginRight: '1rem', color: '#3B82F6' }}>
                  {String.fromCharCode(65 + idx)}.
                </strong>
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
