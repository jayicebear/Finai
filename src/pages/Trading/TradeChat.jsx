import { useState, useRef, useEffect } from 'react'
import styles from './TradeChat.module.css'

const MOCK_USERS = ['Alex', 'Sarah', 'MikeJ', 'jin_k', 'Emma', 'David', 'Yuna', 'trader99']

const INITIAL_MESSAGES = [
  { id: 1, user: 'Alex',     text: 'AAPL looking really strong today',         time: '14:21' },
  { id: 2, user: 'Yuna',     text: '모멘텀 괜찮은데 조금 더 기다려야 할듯',       time: '14:22' },
  { id: 3, user: 'MikeJ',    text: 'earnings next week, careful',              time: '14:22' },
  { id: 4, user: 'trader99', text: '지금 매수 타이밍 맞나요?',                   time: '14:23' },
  { id: 5, user: 'Emma',     text: 'RSI 65 정도면 아직 과매수 아님',             time: '14:24' },
  { id: 6, user: 'David',    text: 'volume spike 보임 주목해봐야겠네',           time: '14:25' },
  { id: 7, user: 'Sarah',    text: 'resistance at 195, watch out',             time: '14:26' },
  { id: 8, user: 'jin_k',    text: '나 방금 100주 담았어요 ㄷㄷ',               time: '14:27' },
  { id: 9, user: 'Alex',     text: 'bold move lol, good luck',                time: '14:27' },
]

const COLORS = ['#e67e22', '#3498db', '#9b59b6', '#1abc9c', '#e74c3c', '#f39c12', '#2ecc71', '#e91e63']

function userColor(name) {
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

let nextId = 100

export default function TradeChat({ stock }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // random bot message every ~12s
  useEffect(() => {
    const BOT_MSGS = [
      `${stock.id} 지금 어때요?`,
      `volume 올라가고 있네`,
      'buy the dip?',
      `${stock.id} 목표가 얼마로 보세요?`,
      '단타 vs 스윙 어느 쪽?',
      'nice breakout',
      '손절라인 어디 잡으셨어요?',
    ]
    const id = setInterval(() => {
      const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]
      const text = BOT_MSGS[Math.floor(Math.random() * BOT_MSGS.length)]
      const now = new Date()
      const time = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, { id: nextId++, user, text, time }].slice(-60))
    }, 12000)
    return () => clearInterval(id)
  }, [stock.id])

  function send() {
    const text = input.trim()
    if (!text) return
    const now = new Date()
    const time = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { id: nextId++, user: 'You', text, time }].slice(-60))
    setInput('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Live Chat</span>
        <span className={styles.online}>● {Math.floor(Math.random() * 200 + 50)} online</span>
      </div>

      <div className={styles.messages}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.msg} ${msg.user === 'You' ? styles.mine : ''}`}>
            <span className={styles.user} style={{ color: userColor(msg.user) }}>{msg.user}</span>
            <span className={styles.text}>{msg.text}</span>
            <span className={styles.time}>{msg.time}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          placeholder="메시지 입력..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          maxLength={120}
        />
        <button className={styles.sendBtn} onClick={send}>↑</button>
      </div>
    </div>
  )
}
