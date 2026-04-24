import styles from './StrategyPanel.module.css'
import { RISK_LEVELS } from '../../data/aiStrategies'

function StrategyPanel({
  models, selectedModel, onModelChange,
  strategies, selectedStrategy, onStrategyChange,
  customPrompt, onCustomPromptChange,
  riskLevel, onRiskChange,
  budget, onBudgetChange, balance,
  autoMode, onAutoToggle,
  running, onStart, onStop,
}) {
  const isCustom = selectedStrategy.id === 'custom'
  const canStart = !isCustom || customPrompt.trim().length > 0

  return (
    <aside className={styles.panel}>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>AI 모델</h3>
        <ul className={styles.modelList}>
          {models.map(m => (
            <li
              key={m.id}
              className={`${styles.modelItem} ${selectedModel.id === m.id ? styles.modelActive : ''}`}
              style={selectedModel.id === m.id ? { borderColor: m.color } : {}}
              onClick={() => onModelChange(m)}
            >
              <div className={styles.modelTop}>
                <div>
                  <span className={styles.modelName}>{m.name}</span>
                  <span className={styles.modelMaker}>{m.maker}</span>
                </div>
                <span className={styles.modelDot} style={{ background: selectedModel.id === m.id ? m.color : '#ddd' }} />
              </div>
              {selectedModel.id === m.id && <p className={styles.modelDesc}>{m.desc}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>전략</h3>
        <div className={styles.strategyGrid}>
          {strategies.map(s => (
            <button
              key={s.id}
              className={`${styles.strategyBtn} ${selectedStrategy.id === s.id ? styles.strategyActive : ''} ${s.id === 'custom' ? styles.strategyCustomBtn : ''}`}
              onClick={() => !running && onStrategyChange(s)}
            >
              {s.id === 'custom' ? '✦ 커스텀' : s.name}
            </button>
          ))}
        </div>

        {!isCustom && <p className={styles.hint}>{selectedStrategy.desc}</p>}

        {isCustom && (
          <div className={styles.customBox}>
            <div className={styles.customHeader}>
              <span className={styles.customLabel}>전략 프롬프트</span>
              <span className={styles.customCount}>{customPrompt.length} / 300</span>
            </div>
            <textarea
              className={styles.customTextarea}
              placeholder={`예시:\n"RSI 30 이하 과매도 구간에서 매수하고 RSI 70 이상에서 매도. 거래량이 평균의 1.5배 이상일 때만 진입."`}
              value={customPrompt}
              maxLength={300}
              disabled={running}
              rows={6}
              onChange={e => onCustomPromptChange(e.target.value)}
            />
            {customPrompt.trim().length === 0 && (
              <p className={styles.customWarn}>전략을 입력해야 시작할 수 있습니다.</p>
            )}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>리스크</h3>
        <div className={styles.riskRow}>
          {RISK_LEVELS.map(r => (
            <button
              key={r.id}
              className={`${styles.riskBtn} ${riskLevel.id === r.id ? styles.riskActive : ''}`}
              style={riskLevel.id === r.id ? { background: r.color, borderColor: r.color } : {}}
              onClick={() => !running && onRiskChange(r)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>투자 한도</h3>
        <div className={styles.budgetRow}>
          <span className={styles.budgetLabel}>$</span>
          <input
            type="number"
            className={styles.budgetInput}
            value={budget}
            min={1000}
            max={balance}
            step={1000}
            disabled={running}
            onChange={e => onBudgetChange(Math.min(balance, Math.max(1000, parseInt(e.target.value) || 1000)))}
          />
        </div>
        <p className={styles.hint}>잔액: ${balance.toLocaleString()}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>자동 매매</h3>
        <div className={styles.modeRow}>
          <span className={styles.modeLabel}>{autoMode ? 'ON — AI가 직접 거래' : 'OFF — 신호만 표시'}</span>
          <button
            className={`${styles.toggle} ${autoMode ? styles.toggleOn : ''}`}
            style={autoMode ? { background: selectedModel.color } : {}}
            onClick={() => !running && onAutoToggle(v => !v)}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </section>

      <button
        className={`${styles.startBtn} ${running ? styles.stopBtn : ''}`}
        style={!running && canStart ? { background: selectedModel.color } : {}}
        disabled={!running && !canStart}
        onClick={running ? onStop : onStart}
      >
        {running ? '⏹ 중지' : `▶ ${selectedModel.name} 시작`}
      </button>
    </aside>
  )
}

export default StrategyPanel
