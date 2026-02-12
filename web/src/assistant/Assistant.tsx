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
  buttons?: { label: string; action: string }[]
}

export default function Assistant({ facilities }: AssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hi! I can help you understand Toronto\'s chemical risks. What would you like to explore?',
      timestamp: new Date(),
      buttons: [
        { label: '🏆 Highest Risk Facilities', action: 'highest_risk' },
        { label: '⚠️ Anomalies Explained', action: 'anomalies' },
        { label: '🧪 Toxic Chemicals', action: 'chemicals' },
        { label: '📊 How Risk is Calculated', action: 'risk_calc' },
      ],
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

  const handleButtonClick = (action: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: action.replace(/_/g, ' '),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    setTimeout(() => {
      const answer = generateAnswer(action)
      setMessages(prev => [...prev, answer])
      setIsLoading(false)
    }, 500)
  }

  const generateAnswer = (query: string): Message => {
    const lowerQuery = query.toLowerCase()
    let content = ''
    let buttons: { label: string; action: string }[] | undefined

    // Button actions
    if (lowerQuery === 'highest_risk') {
      const sorted = [...facilities]
        .filter(f => f.risk_score != null)
        .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
      const top5 = sorted.slice(0, 5)
      
      content = `**Top 5 Highest Risk Facilities:**\n\n${top5.map((f, i) => 
        `${i + 1}. **${f.name}**\n   Risk: ${f.risk_score?.toFixed(1)}/100${f.anomaly ? ' ⚠️ ANOMALY' : ''}\n   ${f.total_release_kg?.toLocaleString()} kg/year`
      ).join('\n\n')}\n\nWastewater plants dominate due to heavy metal releases (mercury, lead, cadmium).`
      
      buttons = [
        { label: '💧 Why Wastewater Plants?', action: 'wastewater' },
        { label: '📍 Proximity Impact', action: 'proximity' },
        { label: '🔙 Main Menu', action: 'menu' },
      ]
    }
    
    else if (lowerQuery === 'anomalies') {
      const anomalies = facilities.filter(f => f.anomaly)
      const highConfidence = facilities.filter(f => (f as any).anomaly_confidence > 75)
      
      content = `**Anomaly Detection System:**\n\n` +
        `Found ${anomalies.length} anomalous facilities using ensemble ML:\n\n` +
        `**4-Method Voting System:**\n` +
        `1. Isolation Forest - global outliers\n` +
        `2. Industry Analysis - peer comparison\n` +
        `3. Extreme Risk - 95th percentile\n` +
        `4. Carcinogen+Proximity - toxic combos\n\n` +
        `Anomaly declared if 2+ methods agree.\n\n` +
        `${highConfidence.length} facilities have >75% confidence scores.`
      
      buttons = [
        { label: '🎯 View Anomalies', action: 'list_anomalies' },
        { label: '🔬 ML Details', action: 'ml_details' },
        { label: '🔙 Main Menu', action: 'menu' },
      ]
    }
    
    else if (lowerQuery === 'chemicals') {
      content = `**Most Toxic Chemicals (Score/100):**\n\n` +
        `🥇 Mercury (100) - Extreme neurotoxin\n` +
        `🥈 Lead (95) - Children's brain damage\n` +
        `🥉 Formaldehyde (92) - Carcinogen\n` +
        `⚠️ Chromium VI (90) - "Erin Brockovich chemical"\n` +
        `⚠️ Benzene (88) - Causes leukemia\n` +
        `⚠️ Cadmium (87) - Kidney/lung damage\n\n` +
        `Scores based on EPA IRIS & IARC classifications.`
      
      buttons = [
        { label: '💀 Heavy Metals', action: 'heavy_metals' },
        { label: '☁️ VOCs & NOx', action: 'vocs' },
        { label: '🔙 Main Menu', action: 'menu' },
      ]
    }
    
    else if (lowerQuery === 'risk_calc') {
      content = `**Risk Score Calculation:**\n\n` +
        `**40%** - Chemical Toxicity Weight\n` +
        `Each chemical scored 0-100. Mercury=100, VOCs=58.\n\n` +
        `**25%** - Release Volume\n` +
        `Total kg released (log-scaled, industry-normalized).\n\n` +
        `**20%** - Maximum Single Toxin\n` +
        `Even small amounts of extreme toxins matter.\n\n` +
        `**15%** - Heavy Metals\n` +
        `Mercury, lead, cadmium tracked separately.\n\n` +
        `**Multipliers:**\n` +
        `• Proximity: 1.0-2.0x for schools/hospitals nearby\n` +
        `• Carcinogens: +15% if 2+ present`
      
      buttons = [
        { label: '📍 Proximity Explained', action: 'proximity' },
        { label: '📊 Compare Industries', action: 'industries' },
        { label: '🔙 Main Menu', action: 'menu' },
      ]
    }
    
    else if (lowerQuery === 'wastewater') {
      content = `**Why Wastewater Plants Rank Highest:**\n\n` +
        `Toronto's 3 treatment plants process city sewage but release:\n\n` +
        `• **Mercury** - 11 kg/year from amalgam fillings\n` +
        `• **Lead** - 527 kg/year from old pipes\n` +
        `• **Cadmium** - 422 kg/year from industrial runoff\n` +
        `• **PAHs** - 118 kg/year carcinogens\n\n` +
        `Heavy metals bioaccumulate in Lake Ontario food chain. Risk scores: 97-100/100.`
      
      buttons = [
        { label: '🐟 Food Chain Impact', action: 'bioaccumulation' },
        { label: '🔙 Main Menu', action: 'menu' },
      ]
    }
    
    else if (lowerQuery === 'proximity') {
      content = `**Proximity Risk Multiplier:**\n\n` +
        `Location matters. Same emissions near a school = higher risk than in industrial zone.\n\n` +
        `**Distance Decay:**\n` +
        `• <1km from hospital/school: 1.5-2.0x\n` +
        `• 1-5km: 1.2-1.5x\n` +
        `• >5km: 1.0x baseline\n\n` +
        `**Sensitive Locations:**\n` +
        `SickKids, Toronto General, U of T, York U, high-density residential.\n\n` +
        `Example: U of T steam plant gets 1.57x multiplier for downtown core location.`
      
      buttons = [
        { label: '🎓 U of T Case Study', action: 'uoft' },
        { label: '🔙 Main Menu', action: 'menu' },
      ]
    }
    
    else if (lowerQuery === 'list_anomalies') {
      const anomalies = facilities.filter(f => f.anomaly).slice(0, 8)
      content = `**Anomalous Facilities:**\n\n${anomalies.map((f, i) => 
        `${i + 1}. ${f.name}\n   Risk: ${f.risk_score?.toFixed(1)} | ${f.industry}`
      ).join('\n\n')}\n\nAnomalies indicate unusual emissions vs industry peers.`
      
      buttons = [{ label: '🔙 Main Menu', action: 'menu' }]
    }
    
    else if (lowerQuery === 'heavy_metals') {
      const heavyMetal = facilities.filter(f => 
        f.chemicals?.some(c => 
          ['mercury', 'lead', 'cadmium', 'chromium', 'arsenic'].some(m => 
            c.name.toLowerCase().includes(m)
          )
        )
      )
      content = `**Heavy Metal Emitters:**\n\n` +
        `Found ${heavyMetal.length} facilities releasing heavy metals.\n\n` +
        `**Why They're Dangerous:**\n` +
        `• Bioaccumulate in body/environment\n` +
        `• Persist for decades in soil\n` +
        `• No safe exposure level for lead/mercury\n` +
        `• Target: nervous system, kidneys, development`
      
      buttons = [{ label: '🔙 Main Menu', action: 'menu' }]
    }
    
    else if (lowerQuery === 'menu') {
      content = 'What would you like to explore?'
      buttons = [
        { label: '🏆 Highest Risk Facilities', action: 'highest_risk' },
        { label: '⚠️ Anomalies Explained', action: 'anomalies' },
        { label: '🧪 Toxic Chemicals', action: 'chemicals' },
        { label: '📊 How Risk is Calculated', action: 'risk_calc' },
      ]
    }
    
    else {
      // Free-form question handling
      if (lowerQuery.includes('total') || lowerQuery.includes('how much')) {
        const total = facilities.reduce((sum, f) => sum + (f.total_release_kg ?? 0), 0)
        content = `**Total Tracked Emissions:** ${total.toLocaleString()} kg/year\n\nIncludes air, water, land, disposal, and recycling pathways.`
      } else if (lowerQuery.includes('industry') || lowerQuery.includes('sector')) {
        const industries: Record<string, number> = {}
        facilities.forEach(f => {
          industries[f.industry ?? 'Unknown'] = (industries[f.industry ?? 'Unknown'] ?? 0) + 1
        })
        const top = Object.entries(industries).sort((a, b) => b[1] - a[1]).slice(0, 5)
        content = `**Top Industries:**\n\n${top.map(([ind, count]) => `• ${ind}: ${count} facilities`).join('\n')}`
      } else {
        content = 'I can help with:\n• Risk scores & calculations\n• Chemical toxicity\n• Anomaly detection\n• Specific facilities\n\nWhat interests you?'
      }
      
      buttons = [{ label: '🔙 Main Menu', action: 'menu' }]
    }

    return {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      buttons,
    }
  }

  const handleSend = () => {
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

    setTimeout(() => {
      const answer = generateAnswer(input)
      setMessages(prev => [...prev, answer])
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
        aria-label="Ask questions"
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
              <h3>💬 Ask Me Anything</h3>
              <button className="assistant-close" onClick={() => setIsOpen(false)}>×</button>
            </div>

            <div className="assistant-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message message-${msg.role}`}>
                  <div className="message-bubble">
                    {msg.content.split('\n').map((line, i) => (
                      <div key={i}>{line.startsWith('**') && line.endsWith('**') ? 
                        <strong>{line.slice(2, -2)}</strong> : line}</div>
                    ))}
                  </div>
                  {msg.buttons && (
                    <div className="message-buttons">
                      {msg.buttons.map((btn, i) => (
                        <button
                          key={i}
                          className="message-button"
                          onClick={() => handleButtonClick(btn.action)}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
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
                placeholder="Ask about risk, chemicals, facilities..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <button
                className="assistant-send"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
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