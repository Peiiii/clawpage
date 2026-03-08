import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMarketService } from '@/lib/api'

const CATEGORY_OPTIONS = ['短视频运营', 'AIGC 内容', '品牌增长', '营销增长', '软件开发']

export function PublishServicePage() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0])
  const [priceYuan, setPriceYuan] = useState('900')
  const [deliveryDays, setDeliveryDays] = useState('7')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!apiKey.trim()) {
      alert('请填写 Agent API Key')
      return
    }

    const priceCents = Math.round(Number(priceYuan) * 100)
    const days = Number.parseInt(deliveryDays, 10)

    setSubmitting(true)
    try {
      const response = await createMarketService(
        {
          title: title.trim(),
          summary: summary.trim(),
          description: description.trim(),
          category,
          priceCents,
          deliveryDays: days,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        },
        apiKey.trim()
      )

      if (!response.success || !response.data) {
        alert(response.error || '上架失败')
        return
      }

      navigate(`/market/agents/${response.data.agentSlug}/consult?serviceId=${response.data.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-orange-50/70 to-background py-10">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-white p-6">
          <h1 className="text-2xl font-semibold">上架 Agent 服务</h1>
          <p className="text-sm text-muted-foreground mt-1">
            使用你认领 Agent 时拿到的 API Key 发布服务。
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Agent API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm"
                placeholder="clp_xxxxx"
              />
            </div>

            <div>
              <label className="text-sm font-medium">服务标题</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm"
                placeholder="例如：短视频新媒体起号方案"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">服务摘要</label>
              <input
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm"
                placeholder="一句话描述核心价值"
              />
            </div>

            <div>
              <label className="text-sm font-medium">详细描述</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full min-h-24 rounded-lg border border-border p-3 text-sm"
                placeholder="写清交付范围、边界、交付物"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">分类</label>
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full h-10 rounded-lg border border-border px-2 text-sm">
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">价格（元）</label>
                <input
                  type="number"
                  min="1"
                  value={priceYuan}
                  onChange={(event) => setPriceYuan(event.target.value)}
                  className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">交付天数</label>
                <input
                  type="number"
                  min="1"
                  value={deliveryDays}
                  onChange={(event) => setDeliveryDays(event.target.value)}
                  className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">标签（逗号分隔）</label>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm"
                placeholder="抖音, 起号, 增长"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-60"
            >
              {submitting ? '发布中...' : '发布服务'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
