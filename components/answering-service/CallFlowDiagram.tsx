'use client'

import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { logger } from '@/lib/utils/logger'

interface CallFlowDiagramProps {
  code: string
}

export function CallFlowDiagram({ code }: CallFlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logger.info('Mermaid code:', code)
    
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      }
    })

    const renderDiagram = async () => {
      if (containerRef.current && code) {
        try {
          containerRef.current.innerHTML = ''
          const id = `mermaid-${Date.now()}` // unique ID each render
          const { svg } = await mermaid.render(id, code)
          if (containerRef.current) {
            containerRef.current.innerHTML = svg
          }
        } catch (error: unknown) {
          logger.error('Mermaid render error:', error)
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="p-4 text-center text-sm">
                <p class="text-red-500 mb-2">Error rendering diagram</p>
                <pre class="text-red-500 text-xs text-left bg-muted p-2 rounded mb-2">${String(error)}</pre>
                <details class="mt-2 text-left">
                  <summary class="cursor-pointer text-sm">View Mermaid Code</summary>
                  <pre class="mt-2 p-2 bg-muted rounded text-xs overflow-auto whitespace-pre-wrap"><code>${code}</code></pre>
                </details>
              </div>
            `
          }
        }
      }
    }

    renderDiagram()
  }, [code])

  return (
    <div 
      ref={containerRef} 
      className="bg-white p-4 rounded-lg overflow-auto"
    />
  )
}

