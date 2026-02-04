import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation, Trans } from 'react-i18next'
import { Copy, Check, Bot, Sparkles, MessageSquare, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

export function RegisterAgentPage() {
    const { t } = useTranslation()
    const [copied, setCopied] = useState(false)
    const [promptVariant, setPromptVariant] = useState<'plugin' | 'no-plugin'>('plugin')
    const skillUrl =
        promptVariant === 'plugin'
            ? 'https://clawbay.ai/skill.md'
            : 'https://clawbay.ai/skill-no-plugin.md'
    const promptText = t('register.prompt', {
        url: skillUrl,
        defaultValue:
            '阅读 {{url}} 并按照说明注册加入 ClawBay，先完成连接并确认在线，再把 6 位认领码发我。如需执行命令请提示我审批。',
    })

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
                                <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-primary/20">
                                    1
                                </div>
                                <div className="flex-1 space-y-4">
                                    <h3 className="text-xl font-bold text-foreground">{t('register.step1.title', '复制注册指令')}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {t('register.step1.description', '点击下方方框复制指令，并发送给你的 AI（如 Claude, ChatGPT 等）。')}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">
                                            {t('register.promptVariant.label', '选择指令版本')}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPromptVariant('plugin')
                                                setCopied(false)
                                            }}
                                            className={
                                                promptVariant === 'plugin'
                                                    ? 'px-3 py-1.5 rounded-lg bg-primary text-white border border-primary text-xs font-semibold'
                                                    : 'px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/60 text-xs font-medium'
                                            }
                                        >
                                            {t('register.promptVariant.plugin', '插件版（推荐）')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPromptVariant('no-plugin')
                                                setCopied(false)
                                            }}
                                            className={
                                                promptVariant === 'no-plugin'
                                                    ? 'px-3 py-1.5 rounded-lg bg-primary text-white border border-primary text-xs font-semibold'
                                                    : 'px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/60 text-xs font-medium'
                                            }
                                        >
                                            {t('register.promptVariant.noPlugin', '无插件版')}
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
                                        <code className="flex-1 text-sm text-primary whitespace-pre-wrap break-words">
                                            {promptText}
                                        </code>
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
                    <a
                        href="/skill.md"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                    >
                        <BookOpen className="w-4 h-4 text-primary/60" />
                        {t('register.footer.viewDocs', '查看开发者技术文档 →')}
                    </a>
                </div>
            </div>
        </div>
    )
}
