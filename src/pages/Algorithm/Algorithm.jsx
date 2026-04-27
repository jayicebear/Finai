import { useState } from 'react'
import { algorithms } from '../../data/algorithms'
import AlgoChart from './AlgoChart'
import styles from './Algorithm.module.css'

function AlgoDetail({ algo }) {
  return (
    <div className={styles.detailCard}>
      <div className={styles.detailTop}>
        <span className={styles.detailName}>{algo.name}</span>
        <span
          className={styles.detailTag}
          style={{ color: algo.tagColor, background: algo.tagColor + '18' }}
        >
          {algo.tag}
        </span>
      </div>
      <div className={styles.detailDiff}>난이도: {algo.difficulty}</div>
      <p className={styles.detailDesc}>{algo.description}</p>

      <div className={styles.chartWrap}>
        <div className={styles.chartTitle}>예시 차트</div>
        <AlgoChart type={algo.chartType} />
      </div>

      <div className={styles.signalsRow}>
        {algo.signals.map(s => (
          <div
            key={s.label}
            className={`${styles.signalBox} ${s.type === 'BUY' ? styles.signalBuy : styles.signalSell}`}
          >
            <div className={styles.signalLabel}>
              {s.type === 'BUY' ? '▲ ' : '▼ '}{s.label}
            </div>
            <div className={styles.signalDesc}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div className={styles.prosConsRow}>
        <div className={styles.prosBox}>
          <div className={styles.prosConsTitle}>장점</div>
          <ul className={styles.prosConsList}>
            {algo.pros.map(p => <li key={p}>{p}</li>)}
          </ul>
        </div>
        <div className={styles.consBox}>
          <div className={styles.prosConsTitle}>단점</div>
          <ul className={styles.prosConsList}>
            {algo.cons.map(c => <li key={c}>{c}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function Algorithm() {
  const [selected, setSelected] = useState(algorithms[0])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Trading Algorithm</h1>
        <p className={styles.subtitle}>주요 퀀트 트레이딩 전략의 원리와 신호를 알아보세요</p>
      </div>

      <div className={styles.body}>
        <div className={styles.list}>
          {algorithms.map(algo => (
            <div
              key={algo.id}
              className={`${styles.card} ${selected.id === algo.id ? styles.cardActive : ''}`}
              onClick={() => setSelected(algo)}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardName}>{algo.name}</span>
                <span
                  className={styles.cardTag}
                  style={
                    selected.id === algo.id
                      ? { color: algo.tagColor, background: algo.tagColor + '30' }
                      : { color: algo.tagColor, background: algo.tagColor + '18' }
                  }
                >
                  {algo.tag}
                </span>
              </div>
              <div className={styles.cardSummary}>{algo.summary}</div>
              <div className={styles.cardDiff}>난이도: {algo.difficulty}</div>
            </div>
          ))}
        </div>

        <div className={styles.detail}>
          {selected ? (
            <AlgoDetail algo={selected} />
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📈</span>
              <span>알고리즘을 선택하세요</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
