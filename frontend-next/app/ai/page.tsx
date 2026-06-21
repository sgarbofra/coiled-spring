'use client'

import { useEffect, useRef, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { scannerStore } from '@/lib/scanner-store'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type Message = { role: 'user' | 'assistant'; content: string }

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setStreaming(true)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    // Safety timeout: if streaming doesn't complete in 65 seconds, stop it
    const streamTimeout = setTimeout(() => {
      console.warn('[TIMEOUT] Stream exceeded 65 seconds, forcing stop')
      setStreaming(false)
      setMessages(prev => {
        const updated = [...prev]
        const lastMsg = updated[updated.length - 1]
        if (lastMsg.content.includes('<cs-table>') && !lastMsg.content.includes('</cs-table>')) {
          // Incomplete table: append error message
          updated[updated.length - 1] = {
            ...lastMsg,
            content: lastMsg.content + '\n\n⚠️ [TIMEOUT: Risposta incompleta - riprova]'
          }
        }
        return updated
      })
    }, 65000) // 65 seconds (backend timeout is 60s)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        credentials: 'include', // Send cookies (cs_token) with request
      })

      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            if (parsed.type === 'text') {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + parsed.text,
                }
                return updated
              })
            }

            if (parsed.type === 'scan_results') {
              // Invia risultati al Terminal Scanner
              scannerStore.dispatch(parsed.results, parsed.filters)
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'CONNECTION ERROR' }
        return updated
      })
    } finally {
      clearTimeout(streamTimeout)
      setStreaming(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <ProtectedRoute>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: bb.bg, color: bb.white, fontFamily: 'Courier New, monospace' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '64px 16px' }}>
            <p style={{ fontSize: '38.4px', marginBottom: '8px' }}>🌀</p>
            <p style={{ fontSize: '19.2px', fontWeight: 'bold', color: bb.orange, letterSpacing: '2px', marginBottom: '4px' }}>COILED AI</p>
            <p style={{ fontSize: '13.2px', color: bb.gray, letterSpacing: '1px' }}>LEAPS EXPERT · OPTIONS GREEKS · STRATEGIES</p>
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxWidth: '600px' }}>
              {[
                'What is a LEAPS and why use it?',
                'When is the right time to buy LEAPS?',
                'Explain the PMCC strategy',
                'How to manage LEAPS under 90 days?',
              ].map(q => (
                <button key={q} onClick={() => { setInput(q) }}
                  style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.panel, color: bb.gray, padding: '8px 12px', fontSize: '12px', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', letterSpacing: '0.5px' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = bb.orange, e.currentTarget.style.color = bb.white)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = bb.border2, e.currentTarget.style.color = bb.gray)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '70%',
              backgroundColor: m.role === 'user' ? bb.orange : bb.surface,
              color: m.role === 'user' ? '#000' : bb.white,
              border: m.role === 'user' ? 'none' : `1px solid ${bb.border2}`,
              padding: '12px 16px',
              fontSize: '14.4px',
              whiteSpace: 'pre-wrap',
              letterSpacing: '0.3px',
              lineHeight: '1.6'
            }}>
              {m.content}
              {m.role === 'assistant' && streaming && i === messages.length - 1 && (
                <span style={{ display: 'inline-block', marginLeft: '4px', height: '16px', width: '2px', backgroundColor: bb.amber, animation: 'pulse 1s infinite' }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${bb.border2}`, padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
            placeholder="ASK ABOUT LEAPS, GREEKS, STRATEGIES..."
            rows={2}
            style={{ flex: 1, resize: 'none', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '12px 16px', fontSize: '14.4px', fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={send} disabled={streaming || !input.trim()}
            style={{
              backgroundColor: (streaming || !input.trim()) ? bb.border2 : bb.orange,
              color: '#000', border: 'none', padding: '8px 20px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px',
              cursor: (streaming || !input.trim()) ? 'not-allowed' : 'pointer', alignSelf: 'flex-end'
            }}>
            {streaming ? '...' : 'SEND'}
          </button>
        </div>
        <p style={{ marginTop: '4px', fontSize: '12px', color: bb.gray, letterSpacing: '0.5px' }}>ENTER TO SEND · SHIFT+ENTER FOR NEW LINE</p>
      </div>
    </div>
    </ProtectedRoute>
  )
}
