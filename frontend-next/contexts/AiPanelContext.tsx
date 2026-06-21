'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type AiPanelState = 'closed' | 'panel' | 'fullscreen'

type AiPanelContextType = {
  panelState: AiPanelState
  setPanelState: (s: AiPanelState) => void
  triggerMessage: (msg: string) => void
  registerTrigger: (fn: (msg: string) => void) => void
}

const AiPanelContext = createContext<AiPanelContextType>({
  panelState: 'closed',
  setPanelState: () => {},
  triggerMessage: () => {},
  registerTrigger: () => {},
})

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [panelState, setPanelState] = useState<AiPanelState>('closed')
  const triggerRef = useRef<((msg: string) => void) | null>(null)

  const registerTrigger = useCallback((fn: (msg: string) => void) => {
    triggerRef.current = fn
  }, [])

  const triggerMessage = useCallback((msg: string) => {
    setPanelState('panel')
    setTimeout(() => triggerRef.current?.(msg), 100)
  }, [])

  return (
    <AiPanelContext.Provider value={{ panelState, setPanelState, triggerMessage, registerTrigger }}>
      {children}
    </AiPanelContext.Provider>
  )
}

export const useAiPanel = () => useContext(AiPanelContext)
