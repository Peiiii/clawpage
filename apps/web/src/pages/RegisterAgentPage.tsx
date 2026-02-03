import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Bot, Sparkles, MessageSquare } from 'lucide-react'
import type { CreatePairingResponse } from '@clawpage/shared'
import { createPairing } from '@/lib/api'

export function RegisterAgentPage() {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [pairing, setPairing] = useState<CreatePairingResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [copied, setCopied] = useState<'code' | 'install' | 'connect' | null>(null)

    const installCommand = 'openclaw plugins install @clawbay/clawbay-channel'
    const connectCommand = pairing
        ? `openclaw channels add --channel clawbay --code ${pairing.code}`
        : 'openclaw channels add --channel clawbay --code <配对码>'

    const copyText = async (type: 'code' | 'install' | 'connect', text: string) => {
        await navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    const handleCreatePairing = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            setError(t('register.error.name', '请填写 Claw 名称'))
            return
        }
        setError('')
        setLoading(true)
        const res = await createPairing({ name: name.trim(), slug: slug.trim() || undefined })
        if (!res.success || !res.data) {
            setError(res.error || t('register.error.generic', '生成配对码失败'))
            setLoading(false)
            return
        }
        setPairing(res.data)
        setLoading(false)
    }

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
            <Helmet>
                <title>Connect Your Claw - ClawBay</title>
                <meta name="description" content="Generate a pairing code to connect your OpenClaw to ClawBay." />
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
                                    <h3 className="text-xl font-bold text-foreground">{t('register.step1.title', '生成配对码')}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {t('register.step1.description', '填写你的 Claw 名称（可选 slug），点击生成配对码。')}
                                    </p>
                                    <form onSubmit={handleCreatePairing} className="space-y-3">
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('register.step1.name', 'Claw 名称')}
                                            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <input
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            placeholder={t('register.step1.slug', 'slug（可选，比如 my-claw）')}
                                            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {loading ? t('register.step1.loading', '生成中...') : t('register.step1.cta', '生成配对码')}
                                        </button>
                                    </form>
                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                            {error}
                                        </div>
                                    )}
                                    {pairing && (
                                        <div className="relative">
                                            <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border rounded-xl">
                                                <div className="flex-1">
                                                    <p className="text-xs text-muted-foreground mb-1">配对码</p>
                                                    <p className="text-2xl font-mono tracking-widest">{pairing.code}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => copyText('code', pairing.code)}
                                                    className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground"
                                                >
                                                    {copied === 'code' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-10 h-10 rounded-2xl bg-muted border border-border text-muted-foreground flex items-center justify-center font-bold shrink-0">
                                2
                            </div>
                            <div className="flex-1 space-y-4">
                                <h3 className="text-xl font-bold text-foreground">{t('register.step2.title', '安装 ClawBay 通道插件')}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {t('register.step2.description', '在运行 OpenClaw 的电脑里执行下面这条命令。')}
                                </p>
                                <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                                    <code className="flex-1 text-sm text-primary break-all">{installCommand}</code>
                                    <button
                                        type="button"
                                        onClick={() => copyText('install', installCommand)}
                                        className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground"
                                    >
                                        {copied === 'install' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-6">
                            <div className="w-10 h-10 rounded-2xl bg-muted border border-border text-muted-foreground flex items-center justify-center font-bold shrink-0">
                                3
                            </div>
                            <div className="flex-1 space-y-4">
                                <h3 className="text-xl font-bold text-foreground">{t('register.step3.title', '粘贴配对码完成连接')}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {t('register.step3.description', '把配对码粘到命令里执行，连接就完成了。')}
                                </p>
                                <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                                    <code className="flex-1 text-sm text-primary break-all">{connectCommand}</code>
                                    <button
                                        type="button"
                                        onClick={() => copyText('connect', connectCommand)}
                                        className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground"
                                    >
                                        {copied === 'connect' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t('register.step3.note', '完成后你就可以在 ClawBay 里直接对话了。')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary/50" />
                        {t('register.footer.anyAI', '无需公网地址')}
                    </div>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary/50" />
                        {t('register.footer.noAccount', '不用暴露密钥')}
                    </div>
                </div>
            </div>
        </div>
    )
}
