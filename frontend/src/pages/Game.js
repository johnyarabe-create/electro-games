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

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*, categories(name, color)')
      .eq('is_active', true)
      .order('id', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    // Mezclar preguntas aleatoriamente
    const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 10);
    setQuestions(shuffled);
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
    
    // Guardar sesión de juego
    await supabase.from('game_sessions').insert([{
      user_id: profile.id,
      score: correctCount * 100,
      correct_answers: correctCount,
      total_questions: finalAnswers.length,
      xp_earned: totalXP,
      completed: true
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

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando preguntas...</div>;

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
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            marginTop: '2rem', 
            padding: '1rem 2rem', 
            background: '#3B82F6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '0.5rem', 
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.125rem', color: '#6b7280' }}>
          Pregunta {current + 1} de {questions.length}
        </span>
        <span style={{ 
          background: q.categories?.color || '#3B82F6', 
          color: 'white', 
          padding: '0.5rem 1rem', 
          borderRadius: '9999px',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}>
          {q.categories?.name}
        </span>
      </div>
      
      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '1rem', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', lineHeight: '1.5' }}>
          {q.question_text}
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {q.options.map((opt, idx) => (
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
      </div>
    </div>
  );
};

export default Game;