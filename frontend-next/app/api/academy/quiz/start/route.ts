/**
 * POST /api/academy/quiz/start
 *
 * Seleziona 10 domande casuali dalla question bank (letta dal filesystem),
 * crea un QuizAttempt sul backend Python, restituisce le domande al client
 * SENZA le risposte corrette.
 *
 * Body: { module_id?: number }  (default 1)
 */

import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import fs from 'fs'
import path from 'path'

const QUESTIONS_PER_QUIZ = 10

// Cerca il file in più posizioni: funziona sia in locale che su Railway
function loadQuestionBank() {
  const candidates = [
    path.join(process.cwd(), 'data', 'questions_bank.json'),          // produzione: frontend-next/data/
    path.join(process.cwd(), '..', 'Academy', 'questions_bank.json'), // dev locale: repo root/Academy/
    path.join(process.cwd(), 'Academy', 'questions_bank.json'),       // dev con cwd = repo root
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  }
  throw new Error(
    'questions_bank.json non trovato. Copia Academy/questions_bank.json in frontend-next/data/'
  )
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { module_id?: number }
    const module_id = body.module_id ?? 1

    // Verifica autenticazione
    const me = await pythonFetch('/api/auth/me')
    if (!me.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Carica domande e seleziona 10 casuali
    const bank = loadQuestionBank()
    const allQuestions: Array<{ id: string; text: string; answers: Array<{ text: string; correct: boolean }> }> =
      bank.slides.flatMap((s: { questions: unknown[] }) => s.questions)

    if (allQuestions.length < QUESTIONS_PER_QUIZ) {
      return NextResponse.json({ error: 'Not enough questions in bank' }, { status: 500 })
    }

    const selected = pickRandom(allQuestions, QUESTIONS_PER_QUIZ)
    const questionIds = selected.map(q => q.id)

    // Crea (o recupera) attempt su Python
    const res = await pythonFetch('/api/academy/attempts', {
      method: 'POST',
      body: JSON.stringify({ module_id, question_ids: questionIds }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(err, { status: res.status })
    }

    const attempt = await res.json()

    // Risposta al client: domande SENZA correct flag
    const questions = selected.map(q => ({
      id: q.id,
      text: q.text,
      options: q.answers.map(a => a.text),
    }))

    // Se l'attempt era già aperto, ricostruisci le domande nell'ordine originale
    const isResumed = attempt.answers.length > 0
    let finalQuestions = questions
    if (isResumed) {
      // Ricostruisci le domande nell'ordine dell'attempt esistente
      const qMap = new Map(allQuestions.map(q => [q.id, q]))
      finalQuestions = attempt.question_ids.map((id: string) => {
        const q = qMap.get(id)
        return q ? { id: q.id, text: q.text, options: q.answers.map(a => a.text) } : null
      }).filter(Boolean)
    }

    return NextResponse.json({
      ok: true,
      attempt_id: attempt.id,
      module_id: attempt.module_id,
      status: attempt.status,
      questions: finalQuestions,
      answers_count: attempt.answers.length,
      total_questions: attempt.question_ids.length,
      resumed: isResumed,
    })
  } catch (e) {
    console.error('[ACADEMY] /quiz/start error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
