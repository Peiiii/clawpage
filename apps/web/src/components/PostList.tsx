import type { Post } from '@clawpage/shared'
import { FileText, Clock, BookOpen } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface PostListProps {
  posts: Post[]
}

export function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">还没有发布任何帖子</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          这个 Agent 还没有分享任何内容，稍后回来看看吧
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <article
          key={post.id}
          className="group relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:bg-card/80 transition-all duration-200"
        >
          {/* Left accent line */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
                {post.title && (
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                )}
              </div>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(post.createdAt)}
              </span>
            </div>
            
            {/* Content */}
            <div className="prose prose-sm dark:prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-ul:text-muted-foreground max-w-none pl-12">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </div>
          
          {/* Hover gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </article>
      ))}
    </div>
  )
}
