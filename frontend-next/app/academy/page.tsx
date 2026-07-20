'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

  // Video progress / resume
  const videoRef = useRef<HTMLVideoElement>(null)
  const [initialPosition, setInitialPosition] = useState<number>(0)
  const [resumeLabel, setResumeLabel] = useState<string | null>(null)

  // Academy inline chat
  type ChatMessage = { role: 'user' | 'assistant'; content: string }
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatStreaming, setChatStreaming] = useState(false)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

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

  // Salva posizione video — fire-and-forget, fail silently.
  // keepalive: true consente l'invio anche su chiusura tab.
  const saveProgress = useCallback((moduleId: number, lang: string, posSeconds: number) => {
    fetch('/api/academy/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: moduleId, language: lang, position_seconds: posSeconds }),
      keepalive: true,
    }).catch(() => {})
  }, [])

  // Recupera l'ultima posizione salvata e aggiorna initialPosition + resumeLabel.
  // Non lancia mai eccezioni verso il chiamante.
  const fetchInitialPosition = useCallback(async (moduleId: number, lang: string) => {
    try {
      const res = await fetch(`/api/academy/progress?module_id=${moduleId}&language=${lang}`)
      const data = await res.json()
      const pos: number = typeof data.position_seconds === 'number' ? data.position_seconds : 0
      setInitialPosition(pos)
      if (pos > 30) {
        const m = Math.floor(pos / 60)
        const s = Math.floor(pos % 60)
        setResumeLabel(`${m}:${s.toString().padStart(2, '0')}`)
      } else {
        setResumeLabel(null)
      }
    } catch {
      setInitialPosition(0)
      setResumeLabel(null)
    }
  }, [])

  // Ripristina preferenza lingua da localStorage
  useEffect(() => {
    const saved = localStorage.getItem('academy_language') as 'en' | 'it' | null
    if (saved === 'en' || saved === 'it') setLanguage(saved)
  }, [])

  // Gestisce: seek alla posizione salvata + salvataggio periodico durante la riproduzione
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    // Seek non appena i metadata sono disponibili (duration nota)
    const onLoadedMetadata = () => {
      if (initialPosition > 0 && video.duration > 0 && initialPosition < video.duration - 3) {
        video.currentTime = initialPosition
      }
      setResumeLabel(null) // nasconde il badge una volta applicato il seek
    }
    video.addEventListener('loadedmetadata', onLoadedMetadata)

    // Salva al pause (include fine video: ended → paused)
    const onPause = () => saveProgress(activeModule, language, video.currentTime)
    video.addEventListener('pause', onPause)

    // Checkpoint ogni 10 secondi mentre è in play
    const interval = setInterval(() => {
      if (!video.paused && video.currentTime > 0) {
        saveProgress(activeModule, language, video.currentTime)
      }
    }, 10_000)

    // Salva quando la tab viene nascosta (cambio tab / chiusura finestra)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgress(activeModule, language, video.currentTime)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('pause', onPause)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [videoUrl, initialPosition, activeModule, language, saveProgress])

  // Auto-scroll chat al fondo quando arrivano nuovi messaggi
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Apre la chat e mette in pausa il video
  const openChat = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause()
    }
    setChatOpen(true)
    setTimeout(() => chatInputRef.current?.focus(), 100)
  }, [])

  // Invia domanda a CoiledAI (SSE streaming)
  const sendQuestion = useCallback(async () => {
    const msg = chatInput.trim()
    if (!msg || chatStreaming) return
    setChatInput('')

    const updatedMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages([...updatedMessages, { role: 'assistant', content: '' }])
    setChatStreaming(true)

    const modTitle = MODULES.find(m => m.id === activeModule)?.title ?? `Module ${activeModule}`

    try {
      const res = await fetch('/api/academy/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          module_id: activeModule,
          module_title: modTitle,
          language,
        }),
        credentials: 'include',
      })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'))
        for (const line of lines) {
          const payload = line.slice(line.indexOf('data:') + 5).trim()
          if (payload === '[DONE]') break
          if (!payload) continue
          try {
            const parsed = JSON.parse(payload)
            if (parsed.type === 'text') {
              setChatMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + parsed.text }
                }
                return updated
              })
            }
          } catch { /* skip malformed SSE chunk */ }
        }
      }
    } catch {
      setChatMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last && last.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = { ...last, content: 'Errore di connessione a CoiledAI.' }
        }
        return updated
      })
    } finally {
      setChatStreaming(false)
    }
  }, [chatInput, chatMessages, chatStreaming, activeModule, language])

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

  // Apre la view video per un modulo, fetchando URL e posizione salvata in parallelo
  const openModule = useCallback(async (moduleId: number) => {
    setActiveModule(moduleId)
    setError(null)
    setResumeLabel(null)
    setInitialPosition(0)
    setChatOpen(false)
    setChatMessages([])
    setChatInput('')
    setView('video')
    await Promise.all([
      fetchVideoUrl(moduleId, language),
      fetchInitialPosition(moduleId, language),
    ])
  }, [language, fetchVideoUrl, fetchInitialPosition])

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
              onClick={() => { setView('modules'); setVideoUrl(null); setChatOpen(false); setChatMessages([]) }}
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
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: css.text2, fontFamily: css.mono, letterSpacing: '1px' }}>LANGUAGE:</span>
            {(['en', 'it'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang)
                  localStorage.setItem('academy_language', lang)
                  setResumeLabel(null)
                  setInitialPosition(0)
                  fetchVideoUrl(activeModule, lang)
                  fetchInitialPosition(activeModule, lang)
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

          {/* Resume badge — visibile finché il seek non è applicato */}
          {resumeLabel && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(232,119,34,0.08)', border: `1px solid rgba(232,119,34,0.3)`,
              color: css.orange, fontFamily: css.mono, fontSize: '11px', letterSpacing: '1px',
              padding: '5px 12px', marginBottom: '12px',
            }}>
              ▶ RIPRENDENDO DA {resumeLabel}
            </div>
          )}

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
                ref={videoRef}
                controls
                preload="metadata"
                style={{ width: '100%', height: '100%', display: 'block' }}
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : null}
          </div>

          {/* Bottone QUESTION + chat inline */}
          <div style={{ marginBottom: '20px' }}>

            {/* Trigger */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: chatOpen ? '0' : '0' }}>
              <button
                onClick={chatOpen ? () => setChatOpen(false) : openChat}
                style={{
                  width: '100%',
                  background: chatOpen ? 'rgba(232,119,34,0.06)' : 'transparent',
                  color: chatOpen ? css.orange : css.text2,
                  border: `1px solid ${chatOpen ? css.orange : css.border}`,
                  borderBottom: chatOpen ? 'none' : `1px solid ${chatOpen ? css.orange : css.border}`,
                  padding: '9px 20px', cursor: 'pointer',
                  fontFamily: css.mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                }}
              >
                <span>{chatOpen ? '✕ CLOSE' : '? ASK'}</span>
              </button>
            </div>

            {/* Pannello chat */}
            {chatOpen && (
              <div style={{
                border: `1px solid ${css.orange}`,
                display: 'flex', flexDirection: 'column', height: '340px',
                background: css.surface,
              }}>

                {/* Intestazione */}
                <div style={{
                  padding: '8px 16px',
                  borderBottom: `1px solid ${css.border}`,
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ color: css.text2, fontFamily: css.mono, fontSize: '10px', letterSpacing: '1px' }}>
                    ASK A QUESTION — MODULE {activeModule}
                  </span>
                </div>

                {/* Messaggi */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {chatMessages.length === 0 && (
                    <div style={{ color: css.text2, fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                      Hai una domanda sul modulo? Scrivi qui sotto.
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i}>
                      <div style={{ fontSize: '10px', fontFamily: css.mono, letterSpacing: '1px', marginBottom: '4px',
                        color: m.role === 'user' ? css.text2 : css.orange }}>
                        {m.role === 'user' ? 'YOU' : 'COILED AI'}
                      </div>
                      <div style={{
                        fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-wrap',
                        color: m.role === 'user' ? css.text2 : css.text,
                      }}>
                        {m.content || (chatStreaming && i === chatMessages.length - 1
                          ? <span style={{ opacity: 0.6 }}>▌</span>
                          : null)}
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                <div style={{
                  borderTop: `1px solid ${css.border}`,
                  padding: '10px 16px',
                  display: 'flex', gap: '8px', alignItems: 'flex-end',
                }}>
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendQuestion()
                      }
                    }}
                    placeholder="Ask about this module... (Enter to send)"
                    rows={2}
                    style={{
                      flex: 1,
                      background: css.surface2,
                      border: `1px solid ${css.border}`,
                      color: css.text,
                      padding: '8px 12px',
                      fontFamily: css.sans,
                      fontSize: '13px',
                      resize: 'none',
                      outline: 'none',
                      lineHeight: 1.5,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = css.orange }}
                    onBlur={e => { e.currentTarget.style.borderColor = css.border }}
                  />
                  <button
                    onClick={sendQuestion}
                    disabled={chatStreaming || !chatInput.trim()}
                    style={{
                      background: chatStreaming || !chatInput.trim() ? css.surface2 : css.orange,
                      color: chatStreaming || !chatInput.trim() ? css.text2 : '#000',
                      border: `1px solid ${chatStreaming || !chatInput.trim() ? css.border : css.orange}`,
                      padding: '10px 16px', cursor: chatStreaming ? 'wait' : 'pointer',
                      fontFamily: css.mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                      flexShrink: 0, transition: 'background 0.15s',
                    }}
                  >
                    {chatStreaming ? '...' : 'SEND'}
                  </button>
                </div>
              </div>
            )}
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
