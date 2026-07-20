/**
 * POST /api/academy/quiz/answer
 *
 * Valida la risposta server-side (legge la question bank, mai esposta al client),
 * poi registra la risposta sul backend Python.
 *
 * Body: { attempt_id: number, question_id: string, chosen_idx: number }
 * Returns: { correct, correct_idx, status, score, passed, answers_count, total_questions }
 */

import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import fs from 'fs'
import path from 'path'

function loadQuestionBank() {
  const candidates = [
    path.join(process.cwd(), 'data', 'questions_bank.json'),
    path.join(process.cwd(), '..', 'Academy', 'questions_bank.json'),
    path.join(process.cwd(), 'Academy', 'questions_bank.json'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  }
  throw new Error('questions_bank.json non trovato. Copia in frontend-next/data/')
}

type Question = {
  id: string
  text: string
  answers: Array<{ text: string; correct: boolean }>
}

// Cache in-memoria per il processo Node.js (evita letture ripetute dal disco)
let _cachedBank: Question[] | null = null
function getAllQuestions(): Question[] {
  if (!_cachedBank) {
    const bank = loadQuestionBank()
    _cachedBank = bank.slides.flatMap((s: { questions: Question[] }) => s.questions)
  }
  return _cachedBank!
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      attempt_id?: number
      question_id?: string
      chosen_idx?: number
    }

    const { attempt_id, question_id, chosen_idx } = body
    if (!attempt_id || !question_id || chosen_idx === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: attempt_id, question_id, chosen_idx' },
        { status: 400 },
      )
    }

    // Auth
    const me = await pythonFetch('/api/auth/me')
    if (!me.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Trova la domanda e verifica la risposta SERVER-SIDE
    const allQuestions = getAllQuestions()
    const question = allQuestions.find(q => q.id === question_id)
    if (!question) {
      return NextResponse.json({ error: 'Question not found in bank' }, { status: 404 })
    }
    if (chosen_idx < 0 || chosen_idx >= question.answers.length) {
      return NextResponse.json({ error: 'Invalid chosen_idx' }, { status: 400 })
    }

    const is_correct = question.answers[chosen_idx].correct === true
    const correct_idx = question.answers.findIndex(a => a.correct === true)

    // Registra su Python
    const res = await pythonFetch(`/api/academy/attempts/${attempt_id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ question_id, chosen_idx, is_correct }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(err, { status: res.status })
    }

    const attempt = await res.json()

    return NextResponse.json({
      ok: true,
      correct: is_correct,
      correct_idx,
      status: attempt.status,
      score: attempt.score,
      passed: attempt.passed,
      answers_count: attempt.answers.length,
      total_questions: attempt.question_ids.length,
    })
  } catch (e) {
    console.error('[ACADEMY] /quiz/answer error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
