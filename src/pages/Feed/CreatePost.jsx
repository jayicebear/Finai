import { useState } from 'react'
import { TAGS } from '../../data/feedData'
import styles from './CreatePost.module.css'

const CONTENT_TAGS = TAGS.filter(t => t !== '전체')

function CreatePost({ onPost }) {
  const [content, setContent] = useState('')
  const [tag, setTag] = useState(CONTENT_TAGS[0])

  function handleSubmit() {
    if (!content.trim()) return
    onPost(content.trim(), tag)
    setContent('')
  }

  return (
    <div className={styles.box}>
      <div className={styles.top}>
        <div className={styles.avatar}>ME</div>
        <textarea
          className={styles.input}
          placeholder="알고리즘, AI 전략, 시장 분석 등 자유롭게 공유해보세요..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
        />
      </div>
      <div className={styles.bottom}>
        <div className={styles.tagRow}>
          {CONTENT_TAGS.map(t => (
            <button
              key={t}
              className={`${styles.tagBtn} ${tag === t ? styles.tagActive : ''}`}
              onClick={() => setTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          className={styles.submit}
          onClick={handleSubmit}
          disabled={!content.trim()}
        >
          게시하기
        </button>
      </div>
    </div>
  )
}

export default CreatePost
