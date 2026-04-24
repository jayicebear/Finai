import { useState } from 'react'
import { initialPosts, TAGS } from '../../data/feedData'
import CreatePost from './CreatePost'
import PostCard from './PostCard'
import styles from './Feed.module.css'

function Feed() {
  const [posts, setPosts] = useState(initialPosts)
  const [activeTag, setActiveTag] = useState('전체')

  function handlePost(content, tag) {
    const newPost = {
      id: Date.now(),
      user: { name: 'You', initials: 'ME' },
      tag,
      time: '방금',
      content,
      likes: 0,
      liked: false,
      comments: [],
    }
    setPosts(prev => [newPost, ...prev])
  }

  function handleLike(postId) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ))
  }

  function handleComment(postId, text) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? {
            ...p,
            comments: [...p.comments, {
              id: Date.now(),
              user: { name: 'You', initials: 'ME' },
              text,
              time: '방금',
            }]
          }
        : p
    ))
  }

  const filtered = activeTag === '전체' ? posts : posts.filter(p => p.tag === activeTag)

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Feed</h1>

        <CreatePost onPost={handlePost} />

        <div className={styles.tags}>
          {TAGS.map(tag => (
            <button
              key={tag}
              className={`${styles.tagBtn} ${activeTag === tag ? styles.tagActive : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>이 태그의 게시글이 없습니다.</div>
          ) : (
            filtered.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onComment={handleComment}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Feed
