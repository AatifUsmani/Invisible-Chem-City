import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Facility } from '../types'
import './Assistant.css'

interface AssistantProps {
  facilities: Facility[]
  selectedZone: Facility[] | null
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function Assistant({ facilities, selectedZone }: AssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hi! I\'m the ChemCity Assistant. Ask me anything about chemical facilities, risk scores, releases, or what you\'re seeing on the map.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateAnswer = (query: string): string => {
    const lowerQuery = query.toLowerCase()

    // Risk-related questions
    if (lowerQuery.includes('risk')) {
      if (lowerQuery.includes('highest') || lowerQuery.includes('highest risk')) {
        const sorted = [...facilities].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
        const top = sorted.slice(0, 3)
        return `The facilities with highest risk scores are:\n${top.map(f => `• ${f.name}: ${f.risk_score?.toFixed(2)}`).join('\n')}`
      }
      if (lowerQuery.includes('how is risk calculated')) {
        return 'Risk scores are calculated using:\n• Total chemical release (45%)\n• Exposure pathways (40%): air, water, land, disposal, recycling\n• Number of chemicals (15%)\nThe score is normalized 0-100.'
      }
      if (lowerQuery.includes('what does risk score')) {
        return 'Risk score (0-100) indicates a facility\'s potential exposure hazard:\n• 0-33: Low risk (green)\n• 33-66: Medium risk (yellow)\n• 66-100: High risk (red)'
      }
    }

    // Chemical/release questions
    if (lowerQuery.includes('chemical') || lowerQuery.includes('release')) {
      if (lowerQuery.includes('total') || lowerQuery.includes('how much')) {
        const total = facilities.reduce((sum, f) => sum + (f.total_release_kg ?? 0), 0)
        return `Total chemical releases tracked: ${total.toLocaleString()} kg\n\nThis includes all pathways: air, water, land, disposal, and recycling.`
      }
      if (lowerQuery.includes('most common') || lowerQuery.includes('top')) {
        const chemMap: Record<string, number> = {}
        facilities.forEach(f => {
          f.chemicals?.forEach(c => {
            chemMap[c.name] = (chemMap[c.name] ?? 0) + c.amount_kg
          })
        })
        const top = Object.entries(chemMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
        return `Top 5 chemicals by release:\n${top.map(([name, amt]) => `• ${name}: ${amt.toLocaleString()} kg`).join('\n')}`
      }
    }

    // Anomaly questions
    if (lowerQuery.includes('anomal')) {
      const anomalies = facilities.filter(f => f.anomaly)
      return `Found ${anomalies.length} anomalous facilities:\n${anomalies.slice(0, 5).map(f => `• ${f.name}`).join('\n')}\n\nAnomalies indicate unusual behavior compared to similar industry peers.`
    }

    // Zone/area questions
    if (lowerQuery.includes('zone') || lowerQuery.includes('selected')) {
      if (selectedZone && selectedZone.length > 0) {
        const total = selectedZone.reduce((sum, f) => sum + (f.total_release_kg ?? 0), 0)
        const avgRisk = selectedZone.reduce((sum, f) => sum + (f.risk_score ?? 0), 0) / selectedZone.length
        return `Selected zone summary:\n• Facilities: ${selectedZone.length}\n• Total release: ${total.toLocaleString()} kg\n• Avg risk score: ${avgRisk.toFixed(2)}`
      }
      return 'Click on a facility on the map to see zone details.'
    }

    // Industry questions
    if (lowerQuery.includes('industry') || lowerQuery.includes('sector')) {
      const industries: Record<string, number> = {}
      facilities.forEach(f => {
        industries[f.industry ?? 'Unknown'] = (industries[f.industry ?? 'Unknown'] ?? 0) + 1
      })
      const top = Object.entries(industries).sort((a, b) => b[1] - a[1]).slice(0, 5)
      return `Top industries represented:\n${top.map(([ind, count]) => `• ${ind}: ${count} facilities`).join('\n')}`
    }

    // Scroll/visual questions
    if (lowerQuery.includes('scroll') || lowerQuery.includes('plume')) {
      return 'Scroll down to see the plume visualization intensity increase. The colored clouds expand based on chemical release volume, showing pollution accumulation over time. The intensity is color-coded by risk level.'
    }

    // Cluster/navigation
    if (lowerQuery.includes('cluster') || lowerQuery.includes('zoom') || lowerQuery.includes('navigate')) {
      return 'The map uses clustering:\n• Zoom out to see facility clusters with numbers\n• Click a cluster to zoom in automatically\n• Click individual facilities to see detailed information'
    }

    // Scenario questions
    if (lowerQuery.includes('scenario') || lowerQuery.includes('what if')) {
      return 'Use the scenario toggles (top-right) to explore:\n• Current: Actual reported data\n• What if removed?: Visualize impact of removing facilities\n• What if 2× emissions?: See doubled emissions scenario'
    }

    // Data source
    if (lowerQuery.includes('data') || lowerQuery.includes('source') || lowerQuery.includes('where')) {
      return 'Data comes from Toronto ChemTRAC (Chemical Tracking & Reporting):\nhttps://open.toronto.ca/dataset/chemical-tracking-chemtrac/\n\nThis tracks chemical releases by facilities to air, water, land, disposal, and recycling.'
    }

    // Help/guidance
    if (lowerQuery.includes('help') || lowerQuery.includes('how to') || lowerQuery.includes('guide')) {
      return 'Getting started:\n1. Explore the map and see facility clusters\n2. Zoom in to see individual facilities\n3. Click a facility to see detailed info & zone exposure\n4. Scroll to see plume intensity change\n5. Use scenarios to explore what-if cases\n\nAsk me about risk, chemicals, anomalies, or anything specific!'
    }

    // Fallback
    return `I can help with questions about:\n• Risk scores & calculations\n• Chemical releases & top pollutants\n• Anomalous facilities\n• Industries & sectors\n• Map navigation & features\n• Data sources\n\nWhat would you like to know?`
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate API call delay
    setTimeout(() => {
      const answer = generateAnswer(input)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 500)
  }

  return (
    <>
      <motion.button
        className="assistant-button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open assistant"
      >
        <span className="assistant-icon">💬</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="assistant-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="assistant-header">
              <h3>ChemCity Guide</h3>
              <button
                className="assistant-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="assistant-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message message-${msg.role}`}>
                  <div className="message-bubble">
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message message-assistant">
                  <div className="message-bubble">
                    <span className="typing-indicator">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="assistant-input-area">
              <input
                type="text"
                className="assistant-input"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSend()
                }}
                disabled={isLoading}
              />
              <button
                className="assistant-send"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                aria-label="Send"
              >
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
