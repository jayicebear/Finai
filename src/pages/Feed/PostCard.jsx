import { useState } from 'react'
import styles from './PostCard.module.css'

function PostCard({ post, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')

  function handleComment() {
    if (!commentText.trim()) return
    onComment(post.id, commentText.trim())
    setCommentText('')
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.avatar}>{post.user.initials}</div>
        <div className={styles.meta}>
          <span className={styles.userName}>{post.user.name}</span>
          <span className={styles.time}>{post.time}</span>
        </div>
        <span className={styles.tag}>{post.tag}</span>
      </div>

      <p className={styles.content}>{post.content}</p>

      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${post.liked ? styles.liked : ''}`}
          onClick={() => onLike(post.id)}
        >
          <span className={styles.actionIcon}>{post.liked ? '♥' : '♡'}</span>
          {post.likes}
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => setShowComments(v => !v)}
        >
          <span className={styles.actionIcon}>💬</span>
          {post.comments.length}
        </button>
      </div>

      {showComments && (
        <div className={styles.comments}>
          {post.comments.length > 0 && (
            <ul className={styles.commentList}>
              {post.comments.map(c => (
                <li key={c.id} className={styles.commentItem}>
                  <div className={styles.commentAvatar}>{c.user.initials}</div>
                  <div className={styles.commentBody}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentUser}>{c.user.name}</span>
                      <span className={styles.commentTime}>{c.time}</span>
                    </div>
                    <p className={styles.commentText}>{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.commentInput}>
            <div className={styles.commentAvatar}>ME</div>
            <input
              type="text"
              className={styles.input}
              placeholder="댓글을 입력하세요..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComment()}
            />
            <button className={styles.commentSubmit} onClick={handleComment}>
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostCard
