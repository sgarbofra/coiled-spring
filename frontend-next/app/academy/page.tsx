'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

// ── Types ────────────────────────────────────────────────────────────────────

type Question = { id: string; text: string; options: string[] }

type QuizState = {
  attempt_id: number
  module_id: number
  questions: Question[]
  current_idx: number           // indice della domanda in corso
  answers: Array<{              // risposte date
    question_id: string
    chosen_idx: number
    correct: boolean
    correct_idx: number
  }>
  status: 'open' | 'finished'
  score: number | null
  passed: boolean | null
  feedback: {                   // feedback sull'ultima risposta
    shown: boolean
    correct: boolean
    correct_idx: number
  } | null
}

type ModuleInfo = {
  id: number
  title: string
  subtitle: string
  lessons: number
  questions: number
  locked: boolean
}

// ── Modules config ───────────────────────────────────────────────────────────

const MODULES: ModuleInfo[] = [
  {
    id: 1,
    title: 'Module 1: Options Fundamentals',
    subtitle: 'What options are, how they work, call vs put, Greeks intro',
    lessons: 27,
    questions: 270,
    locked: false,
  },
  {
    id: 2,
    title: 'Module 2: Volatility & IV',
    subtitle: 'Implied volatility, IV Rank, IV Percentile, volatility cycles',
    lessons: 20,
    questions: 200,
    locked: true,
  },
  {
    id: 3,
    title: 'Module 3: LEAPS Strategy',
    subtitle: 'Long-dated options, time advantage, entry mechanics',
    lessons: 22,
    questions: 220,
    locked: true,
  },
  {
    id: 4,
    title: 'Module 4: Coiled Spring Setup',
    subtitle: 'CS Score, HV compression, scanner workflow, checklist',
    lessons: 18,
    questions: 180,
    locked: true,
  },
  {
    id: 5,
    title: 'Module 5: Risk & Position Sizing',
    subtitle: 'Kelly criterion, max loss per trade, portfolio rules',
    lessons: 15,
    questions: 150,
    locked: true,
  },
]

// ── Utility ──────────────────────────────────────────────────────────────────

const css = {
  bg: '#0D1117',
  surface: '#161B22',
  surface2: '#1C2128',
  border: '#30363D',
  orange: '#E87722',
  green: '#3FB950',
  red: '#F85149',
  text: '#E6EDF3',
  text2: '#8B949E',
  mono: "'JetBrains Mono', 'Courier New', monospace",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AcademyPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()

  const [view, setView] = useState<'modules' | 'video' | 'quiz'>('modules')
  const [quiz, setQuiz] = useState<QuizState | null>(null)
  const [results, setResults] = useState<Array<{ module_id: number; score: number; total: number; passed: boolean; created_at: string }>>([])
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Video state
  const [language, setLanguage] = useState<'en' | 'it'>('en')
  const [activeModule, setActiveModule] = useState<number>(1)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoUnavailable, setVideoUnavailable] = useState(false)

  // Redirect se non autenticato
  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [user, userLoading, router])

  // Carica risultati passati
  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/academy/results')
      const data = await res.json()
      if (data.ok) setResults(data.results)
    } catch { /* non bloccante */ }
  }, [])

  useEffect(() => { fetchResults() }, [fetchResults])

  // Ripristina preferenza lingua da localStorage
  useEffect(() => {
    const saved = localStorage.getItem('academy_language') as 'en' | 'it' | null
    if (saved === 'en' || saved === 'it') setLanguage(saved)
  }, [])

  // Fetch signed URL per il video (chiama /api/academy/video)
  const fetchVideoUrl = useCallback(async (moduleId: number, lang: string) => {
    setVideoLoading(true)
    setVideoUrl(null)
    setVideoUnavailable(false)
    try {
      const res = await fetch(`/api/academy/video?module_id=${moduleId}&language=${lang}`)
      const data = await res.json()
      if (data.unavailable) { setVideoUnavailable(true); return }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Video non disponibile')
      setVideoUrl(data.url)
    } catch {
      setVideoUnavailable(true)
    } finally {
      setVideoLoading(false)
    }
  }, [])

  // Apre la view video per un modulo
  const openModule = useCallback(async (moduleId: number) => {
    setActiveModule(moduleId)
    setError(null)
    setView('video')
    await fetchVideoUrl(moduleId, language)
  }, [language, fetchVideoUrl])

  // Helper: un modulo è bloccato se non è il primo e il precedente non è stato superato
  const isModuleLocked = (moduleId: number) =>
    moduleId > 1 && !results.some(r => r.module_id === moduleId - 1 && r.passed)

  // Controlla se modulo 1 è già stato superato
  const module1Passed = results.some(r => r.module_id === 1 && r.passed)

  // ── Quiz flow ─────────────────────────────────────────────────────────────

  const startQuiz = async (moduleId: number) => {
    setLoadingQuiz(true)
    setError(null)
    try {
      const res = await fetch('/api/academy/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: moduleId }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Errore avvio quiz')

      // Individua l'indice della prima domanda non ancora risposta
      const answeredCount = data.answers_count ?? 0
      setQuiz({
        attempt_id: data.attempt_id,
        module_id: data.module_id,
        questions: data.questions,
        current_idx: answeredCount,
        answers: [],
        status: data.status,
        score: null,
        passed: null,
        feedback: null,
      })
      setView('quiz')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoadingQuiz(false)
    }
  }

  const submitAnswer = async (chosenIdx: number) => {
    if (!quiz || quiz.feedback?.shown) return
    const q = quiz.questions[quiz.current_idx]

    try {
      const res = await fetch('/api/academy/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt_id: quiz.attempt_id,
          question_id: q.id,
          chosen_idx: chosenIdx,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Errore risposta')

      const newAnswer = {
        question_id: q.id,
        chosen_idx: chosenIdx,
        correct: data.correct,
        correct_idx: data.correct_idx,
      }

      setQuiz(prev => prev ? {
        ...prev,
        answers: [...prev.answers, newAnswer],
        status: data.status,
        score: data.score,
        passed: data.passed,
        feedback: { shown: true, correct: data.correct, correct_idx: data.correct_idx },
      } : prev)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore')
    }
  }

  const nextQuestion = () => {
    if (!quiz) return
    const isLast = quiz.current_idx >= quiz.questions.length - 1

    if (isLast || quiz.status === 'finished') {
      // Quiz completato
      fetchResults()
      setQuiz(prev => prev ? { ...prev, status: 'finished', feedback: null } : prev)
      return
    }

    setQuiz(prev => prev ? {
      ...prev,
      current_idx: prev.current_idx + 1,
      feedback: null,
    } : prev)
  }

  // ── Render: quiz ──────────────────────────────────────────────────────────

  if (view === 'quiz' && quiz) {
    const isFinished = quiz.status === 'finished' && quiz.answers.length >= quiz.questions.length
    const progress = ((quiz.current_idx + (quiz.feedback ? 1 : 0)) / quiz.questions.length) * 100

    return (
      <div style={{ background: css.bg, minHeight: '100vh', fontFamily: css.sans, padding: '24px 16px', color: css.text }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ color: css.orange, fontFamily: css.mono, fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>
                COILED SPRING ACADEMY
              </div>
              <div style={{ fontFamily: css.mono, fontSize: '13px', color: css.text2 }}>
                Module {quiz.module_id} — Quiz
              </div>
            </div>
            <button
              onClick={() => { setView('modules'); setQuiz(null) }}
              style={{
                background: 'transparent', border: `1px solid ${css.border}`,
                color: css.text2, padding: '6px 14px', cursor: 'pointer',
                fontFamily: css.mono, fontSize: '11px', letterSpacing: '0.5px',
              }}
            >
              EXIT QUIZ
            </button>
          </div>

          {/* Progress bar */}
          {!isFinished && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: css.text2, fontFamily: css.mono, marginBottom: '6px' }}>
                <span>QUESTION {quiz.current_idx + 1} / {quiz.questions.length}</span>
                <span style={{ color: css.green }}>{quiz.answers.filter(a => a.correct).length} CORRECT</span>
              </div>
              <div style={{ height: '3px', background: css.surface2, borderRadius: '2px' }}>
                <div style={{ height: '3px', background: css.orange, borderRadius: '2px', width: `${progress}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {/* ── RESULTS SCREEN ── */}
          {isFinished ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                fontFamily: css.mono, fontSize: '72px', fontWeight: 700, marginBottom: '8px',
                color: quiz.passed ? css.green : css.red,
              }}>
                {quiz.score}/{quiz.questions.length}
              </div>
              <div style={{ fontSize: '20px', marginBottom: '8px', color: css.text }}>
                {quiz.passed ? 'MODULE PASSED' : 'TRY AGAIN'}
              </div>
              <div style={{ fontSize: '13px', color: css.text2, marginBottom: '32px' }}>
                {quiz.passed
                  ? 'Congratulations! You can now access Module 2.'
                  : 'You need 7/10 correct to pass. Review the material and retry.'}
              </div>

              {/* Answer dots */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
                {quiz.answers.map((a, i) => (
                  <div key={i} style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: a.correct ? css.green : css.red,
                    color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: css.mono, fontSize: '12px', fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => startQuiz(quiz.module_id)}
                  style={{
                    background: quiz.passed ? css.surface2 : css.orange,
                    color: quiz.passed ? css.text2 : '#000',
                    border: `1px solid ${quiz.passed ? css.border : css.orange}`,
                    padding: '10px 24px', cursor: 'pointer',
                    fontFamily: css.mono, fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
                  }}
                >
                  RETRY QUIZ
                </button>
                <button
                  onClick={() => { setView('modules'); setQuiz(null) }}
                  style={{
                    background: quiz.passed ? css.orange : 'transparent',
                    color: quiz.passed ? '#000' : css.text2,
                    border: `1px solid ${quiz.passed ? css.orange : css.border}`,
                    padding: '10px 24px', cursor: 'pointer',
                    fontFamily: css.mono, fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
                  }}
                >
                  BACK TO MODULES
                </button>
              </div>
            </div>
          ) : (
            /* ── QUESTION SCREEN ── */
            (() => {
              const q = quiz.questions[quiz.current_idx]
              const fb = quiz.feedback

              return (
                <div>
                  {/* Question card */}
                  <div style={{
                    background: css.surface, border: `1px solid ${css.border}`,
                    padding: '24px', marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '11px', color: css.orange, fontFamily: css.mono, letterSpacing: '1px', marginBottom: '12px' }}>
                      Q{quiz.current_idx + 1}
                    </div>
                    <div style={{ fontSize: '16px', lineHeight: 1.6, marginBottom: '20px', color: css.text }}>
                      {q.text}
                    </div>

                    {/* Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {q.options.map((opt, idx) => {
                        const isChosen = fb && quiz.answers[quiz.answers.length - 1]?.chosen_idx === idx
                        const isCorrect = fb && fb.correct_idx === idx
                        const isWrong = fb && isChosen && !fb.correct

                        let bg = css.surface2
                        let border = css.border
                        let color = css.text

                        if (isCorrect && fb) { bg = 'rgba(63,185,80,0.1)'; border = css.green; color = css.green }
                        else if (isWrong) { bg = 'rgba(248,81,73,0.1)'; border = css.red; color = css.red }

                        return (
                          <button
                            key={idx}
                            disabled={!!fb}
                            onClick={() => submitAnswer(idx)}
                            style={{
                              background: bg, border: `1px solid ${border}`, color,
                              padding: '12px 16px', textAlign: 'left', cursor: fb ? 'default' : 'pointer',
                              fontFamily: css.sans, fontSize: '14px',
                              display: 'flex', alignItems: 'flex-start', gap: '12px',
                              transition: 'border-color 0.15s, background 0.15s',
                            }}
                            onMouseEnter={e => { if (!fb) { e.currentTarget.style.borderColor = css.orange } }}
                            onMouseLeave={e => { if (!fb) { e.currentTarget.style.borderColor = css.border } }}
                          >
                            <span style={{ color: css.orange, fontFamily: css.mono, fontWeight: 700, minWidth: '20px' }}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            {opt}
                          </button>
                        )
                      })}
                    </div>

                    {/* Feedback */}
                    {fb && (
                      <div style={{
                        marginTop: '16px', padding: '10px 14px',
                        borderLeft: `3px solid ${fb.correct ? css.green : css.red}`,
                        background: fb.correct ? 'rgba(63,185,80,0.05)' : 'rgba(248,81,73,0.05)',
                        color: fb.correct ? css.green : '#FF9999',
                        fontSize: '13px',
                      }}>
                        {fb.correct ? '✓ Correct' : `✗ Wrong — correct answer: ${String.fromCharCode(65 + fb.correct_idx)}`}
                      </div>
                    )}
                  </div>

                  {/* Next button */}
                  {fb && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={nextQuestion}
                        style={{
                          background: css.orange, color: '#000', border: 'none',
                          padding: '12px 28px', cursor: 'pointer',
                          fontFamily: css.mono, fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
                        }}
                      >
                        {quiz.current_idx >= quiz.questions.length - 1 ? 'SEE RESULTS' : 'NEXT QUESTION →'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })()
          )}
        </div>
      </div>
    )
  }

  // ── Render: video view ───────────────────────────────────────────────────

  if (view === 'video') {
    const mod = MODULES.find(m => m.id === activeModule)!
    const modPassed = results.some(r => r.module_id === activeModule && r.passed)

    return (
      <div style={{ background: css.bg, minHeight: '100vh', fontFamily: css.sans, padding: '24px 16px', color: css.text }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ color: css.orange, fontFamily: css.mono, fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>
                COILED SPRING ACADEMY
              </div>
              <div style={{ fontFamily: css.mono, fontSize: '13px', color: css.text2 }}>
                {mod.title}
              </div>
            </div>
            <button
              onClick={() => { setView('modules'); setVideoUrl(null) }}
              style={{
                background: 'transparent', border: `1px solid ${css.border}`,
                color: css.text2, padding: '6px 14px', cursor: 'pointer',
                fontFamily: css.mono, fontSize: '11px', letterSpacing: '0.5px',
              }}
            >
              ← BACK
            </button>
          </div>

          {/* Language toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: css.text2, fontFamily: css.mono, letterSpacing: '1px' }}>LANGUAGE:</span>
            {(['en', 'it'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang)
                  localStorage.setItem('academy_language', lang)
                  fetchVideoUrl(activeModule, lang)
                }}
                style={{
                  background: language === lang ? css.orange : 'transparent',
                  color: language === lang ? '#000' : css.text2,
                  border: `1px solid ${language === lang ? css.orange : css.border}`,
                  padding: '4px 14px', cursor: 'pointer',
                  fontFamily: css.mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Video player */}
          <div style={{
            background: '#000', border: `1px solid ${css.border}`, marginBottom: '20px',
            aspectRatio: '16/9', display: 'flex', alignItems: 'center',
            justifyContent: 'center', overflow: 'hidden', position: 'relative',
          }}>
            {videoLoading ? (
              <div style={{ color: css.text2, fontFamily: css.mono, fontSize: '12px', letterSpacing: '1px' }}>
                LOADING VIDEO...
              </div>
            ) : videoUnavailable ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>▶</div>
                <div style={{ color: css.text2, fontFamily: css.mono, fontSize: '12px', letterSpacing: '1px', marginBottom: '8px' }}>
                  VIDEO COMING SOON
                </div>
                <div style={{ color: css.text2, fontSize: '13px' }}>
                  The video for this module will be available shortly.
                </div>
              </div>
            ) : videoUrl ? (
              <video
                key={videoUrl}
                controls
                preload="metadata"
                style={{ width: '100%', height: '100%', display: 'block' }}
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : null}
          </div>

          {/* Module info */}
          <div style={{ fontSize: '13px', color: css.text2, marginBottom: '24px' }}>
            {mod.subtitle}
          </div>

          {/* CTA quiz */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {modPassed && (
              <button
                onClick={() => { setView('modules'); setVideoUrl(null) }}
                style={{
                  background: 'transparent', color: css.text2,
                  border: `1px solid ${css.border}`,
                  padding: '12px 24px', cursor: 'pointer',
                  fontFamily: css.mono, fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
                }}
              >
                BACK TO MODULES
              </button>
            )}
            <button
              onClick={() => startQuiz(activeModule)}
              disabled={loadingQuiz}
              style={{
                background: css.orange, color: '#000', border: 'none',
                padding: '12px 28px', cursor: loadingQuiz ? 'wait' : 'pointer',
                fontFamily: css.mono, fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
              }}
            >
              {loadingQuiz ? 'LOADING...' : modPassed ? 'RETAKE QUIZ' : 'PROCEED TO QUIZ →'}
            </button>
          </div>

        </div>
      </div>
    )
  }

  // ── Render: module list ───────────────────────────────────────────────────

  return (
    <div style={{ background: css.bg, minHeight: '100vh', fontFamily: css.sans, color: css.text }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontFamily: css.mono, fontSize: '11px', color: css.orange, letterSpacing: '2px', marginBottom: '8px' }}>
            COILED SPRING ACADEMY
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px', color: css.text }}>
            Options Trading Course
          </h1>
          <p style={{ fontSize: '14px', color: css.text2, margin: 0, lineHeight: 1.6 }}>
            5 modules · adaptive quizzes · structured from zero to first real trade.
            Complete each module quiz to unlock the next.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(248,81,73,0.1)', border: `1px solid ${css.red}`, padding: '12px 16px', marginBottom: '24px', color: css.red, fontSize: '13px', fontFamily: css.mono }}>
            ERROR: {error}
          </div>
        )}

        {/* Progress summary (se ci sono risultati) */}
        {results.length > 0 && (
          <div style={{ background: css.surface, border: `1px solid ${css.border}`, padding: '16px 20px', marginBottom: '32px', display: 'flex', gap: '32px' }}>
            <div>
              <div style={{ fontSize: '11px', color: css.text2, fontFamily: css.mono, marginBottom: '4px' }}>MODULES PASSED</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: css.green, fontFamily: css.mono }}>
                {new Set(results.filter(r => r.passed).map(r => r.module_id)).size}/5
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: css.text2, fontFamily: css.mono, marginBottom: '4px' }}>QUIZ ATTEMPTS</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: css.orange, fontFamily: css.mono }}>
                {results.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: css.text2, fontFamily: css.mono, marginBottom: '4px' }}>BEST SCORE M1</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: css.text, fontFamily: css.mono }}>
                {(() => {
                  const m1 = results.filter(r => r.module_id === 1)
                  if (!m1.length) return '—'
                  return `${Math.max(...m1.map(r => r.score))}/${m1[0].total}`
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Module cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {MODULES.map(mod => {
            const locked = isModuleLocked(mod.id)
            const bestResult = results
              .filter(r => r.module_id === mod.id)
              .sort((a, b) => b.score - a.score)[0]
            const passed = results.some(r => r.module_id === mod.id && r.passed)

            return (
              <div
                key={mod.id}
                style={{
                  background: locked ? 'rgba(22,27,34,0.5)' : css.surface,
                  border: `1px solid ${passed ? css.green : css.border}`,
                  padding: '20px 24px',
                  opacity: locked ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    {/* Status dot */}
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: passed ? css.green : mod.locked ? css.border : css.orange,
                    }} />
                    <span style={{ fontWeight: 600, fontSize: '15px', color: locked ? css.text2 : css.text }}>
                      {mod.title}
                    </span>
                    {passed && (
                      <span style={{
                        background: 'rgba(63,185,80,0.1)', color: css.green,
                        border: `1px solid rgba(63,185,80,0.3)`,
                        fontSize: '10px', fontFamily: css.mono, padding: '2px 8px', letterSpacing: '0.5px',
                      }}>
                        PASSED
                      </span>
                    )}
                    {locked && (
                      <span style={{
                        color: css.text2, fontFamily: css.mono, fontSize: '10px', letterSpacing: '0.5px',
                      }}>
                        🔒 LOCKED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: css.text2, marginBottom: '8px' }}>
                    {mod.subtitle}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: css.text2, fontFamily: css.mono }}>
                    <span>{mod.lessons} LESSONS</span>
                    <span>{mod.questions} QUESTIONS</span>
                    {bestResult && (
                      <span style={{ color: passed ? css.green : css.orange }}>
                        BEST {bestResult.score}/{bestResult.total}
                      </span>
                    )}
                  </div>
                </div>

                {!locked && (
                  <button
                    onClick={() => openModule(mod.id)}
                    disabled={videoLoading && activeModule === mod.id}
                    style={{
                      background: css.orange,
                      color: '#000',
                      border: 'none',
                      padding: '10px 20px', cursor: (videoLoading && activeModule === mod.id) ? 'wait' : 'pointer',
                      fontFamily: css.mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    {videoLoading && activeModule === mod.id ? 'LOADING...' : passed ? 'WATCH AGAIN' : 'WATCH MODULE'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Info footer */}
        <div style={{ marginTop: '40px', padding: '20px', background: css.surface2, border: `1px solid ${css.border}`, fontSize: '13px', color: css.text2, lineHeight: 1.7 }}>
          <span style={{ color: css.orange, fontFamily: css.mono, fontSize: '11px', letterSpacing: '1px' }}>HOW IT WORKS  </span>
          Each module ends with a 10-question adaptive quiz drawn from a bank of 270+ questions per module.
          Pass threshold: <span style={{ color: css.text, fontFamily: css.mono }}>7/10</span> correct answers.
          Passing a module unlocks the next.
          You can retake failed quizzes any time — questions are randomly selected each attempt.
        </div>
      </div>
    </div>
  )
}
