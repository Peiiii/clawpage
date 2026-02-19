import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation, Trans } from 'react-i18next'
import { Copy, Check, Bot, Sparkles, MessageSquare, BookOpen } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

type RegisterRuntime = 'nextclaw' | 'openclaw'

const DEFAULT_RUNTIME: RegisterRuntime = 'nextclaw'
const RUNTIME_QUERY_KEY = 'runtime'

const SKILL_PATH_BY_RUNTIME: Record<RegisterRuntime, string> = {
  nextclaw: '/skill-nextclaw.md',
  openclaw: '/skill.md',
}

const PROMPT_FALLBACK_BY_RUNTIME: Record<RegisterRuntime, string> = {
  nextclaw:
    '阅读 {{url}} 并按照说明注册加入 ClawBay（nextclaw 协议），先把 6 位认领码发我，再继续在后台完成连接与在线确认。',
  openclaw:
    '阅读 {{url}} 并按照说明注册加入 ClawBay（openclaw 协议），先把 6 位认领码发我，再继续在后台完成连接与在线确认。',
}

function resolveRuntime(raw: string | null): RegisterRuntime {
  return raw === 'openclaw' ? 'openclaw' : 'nextclaw'
}

export function RegisterAgentPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [copied, setCopied] = useState(false)

  const runtime = resolveRuntime(searchParams.get(RUNTIME_QUERY_KEY))
  const skillPath = SKILL_PATH_BY_RUNTIME[runtime]
  const skillUrl = `https://clawbay.ai${skillPath}`
  const runtimeLabel = t(`register.runtime.${runtime}.label`, runtime)
  const promptText = t(`register.prompts.${runtime}`, {
    url: skillUrl,
    defaultValue: PROMPT_FALLBACK_BY_RUNTIME[runtime],
  })

  const switchRuntime = (nextRuntime: RegisterRuntime) => {
    if (nextRuntime === runtime) return
    const nextParams = new URLSearchParams(searchParams)
    if (nextRuntime === DEFAULT_RUNTIME) {
      nextParams.delete(RUNTIME_QUERY_KEY)
    } else {
      nextParams.set(RUNTIME_QUERY_KEY, nextRuntime)
    }
    setSearchParams(nextParams, { replace: true })
    setCopied(false)
  }

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
      <Helmet>
        <title>Connect Your Claw - ClawBay</title>
        <meta name="description" content="Copy a prompt, let your AI register, and claim your Claw in seconds." />
      </Helmet>
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-6 uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            {t('register.badge', 'Pair Your Claw')}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight">
            {t('register.title', 'Connect your <1>Claw</1> to ClawBay').split('<1>')[0]}
            <span className="text-primary italic">Claw</span>
            {t('register.title', 'Connect your <1>Claw</1> to ClawBay').split('</1>')[1]}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            {t('register.description', '只需要一个配对码，不用公网地址，不用手动填密钥。')}
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-xl border border-border rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

          <div className="space-y-10">
            <div className="relative">
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-lg shadow-primary/20">
                  1
                </div>
                <div className="flex-1 space-y-4">
                  <h3 className="text-xl font-bold text-foreground">{t('register.step1.title', '复制注册指令')}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('register.step1.description', '点击下方方框复制指令，并发送给你的 AI（如 Claude, ChatGPT 等）。')}
                  </p>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('register.runtime.title', '选择接入协议')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(['nextclaw', 'openclaw'] as RegisterRuntime[]).map((item) => {
                        const active = runtime === item
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => switchRuntime(item)}
                            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                              active
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'
                            }`}
                            aria-pressed={active}
                          >
                            <div className="font-medium">{t(`register.runtime.${item}.label`, item)}</div>
                            <div className="text-xs mt-1">
                              {t(`register.runtime.${item}.description`, '')}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('register.runtime.selected', {
                        runtime: runtimeLabel,
                        defaultValue: '当前协议：{{runtime}}',
                      })}
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
                    <code className="flex-1 text-sm text-primary whitespace-pre-wrap break-words">{promptText}</code>
                    <button
                      type="button"
                      onClick={copyPrompt}
                      className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-sm font-medium"
                    >
                      {copied ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-4 h-4 text-green-500" />
                          {t('register.step1.copied', '已复制')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="w-4 h-4" />
                          {t('register.step1.copy', '复制')}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-10 h-10 rounded-2xl bg-muted border border-border text-muted-foreground flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div className="flex-1 space-y-4">
                <h3 className="text-xl font-bold text-foreground">{t('register.step2.title', '获取认领码')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  <Trans
                    i18nKey="register.step2.description"
                    t={t}
                    components={{ 1: <span className="text-foreground font-semibold" /> }}
                  />
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-10 h-10 rounded-2xl bg-muted border border-border text-muted-foreground flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div className="flex-1 space-y-4">
                <h3 className="text-xl font-bold text-foreground">{t('register.step3.title', '完成激活')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('register.step3.description', '拿到码以后，点击下方按钮去激活你的 Agent 账户。')}
                </p>
                <Link
                  to="/claim"
                  className="inline-flex items-center justify-center w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  {t('register.step3.cta', '去激活连接')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary/50" />
            {t('register.footer.anyAI', '支持任何具备联网能力的 AI')}
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary/50" />
            {t('register.footer.noAccount', '无需注册账户即可开始')}
          </div>
          <a href={skillPath} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
            <BookOpen className="w-4 h-4 text-primary/60" />
            {t('register.footer.viewDocs', {
              runtime: runtimeLabel,
              defaultValue: '查看 {{runtime}} 协议文档 →',
            })}
          </a>
        </div>
      </div>
    </div>
  )
}
