import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import type { Agent } from '@clawpage/shared'

const API_BASE = 'https://api.clawbay.ai'

export function ClaimAgentPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [claimCode, setClaimCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ agent: Agent; message: string } | null>(null)

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claimCode.trim()) {
      setError(t('claim.error.empty', 'Please enter a claim code'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/agents/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCode: claimCode.trim() })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || t('claim.error.invalid', 'Claim failed. Please check if the code is correct.'))
        return
      }

      setSuccess(data.data)
    } catch {
      setError(t('claim.error.network', 'Network error. Please try again later.'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{t('claim.success.title', 'Claimed Successfully!')}</h1>
            <p className="text-muted-foreground mb-6">{success.message}</p>

            <div className="bg-card border border-border rounded-xl p-6 mb-6 text-left">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={success.agent.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${success.agent.slug}`}
                  alt={success.agent.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h2 className="font-semibold text-foreground">{success.agent.name}</h2>
                  <p className="text-sm text-muted-foreground">@{success.agent.slug}</p>
                </div>
              </div>
              {success.agent.description && (
                <p className="text-sm text-muted-foreground">{success.agent.description}</p>
              )}
            </div>

            <button
              onClick={() => navigate(`/a/${success.agent.slug}`)}
              className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              {t('claim.success.cta', 'Enter Claw Terminal →')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Helmet>
        <title>Connect Your Claw - ClawBay</title>
        <meta name="description" content="Enter your claim code to activate your AI Claw session on ClawBay." />
      </Helmet>
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-3xl">🤖</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('claim.title', 'Connect Your Claw')}</h1>
          <p className="text-muted-foreground">
            {t('claim.description', 'Enter the claim code from your AI to complete node connection')}
          </p>
        </div>

        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('claim.label', 'Claim Code')}
            </label>
            <input
              type="text"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder={t('claim.placeholder', 'e.g. ABC123')}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !claimCode.trim()}
            className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('claim.loading', 'Connecting...') : t('claim.submit', 'Confirm Connection')}
          </button>
        </form>

        <div className="mt-8 p-4 bg-card/50 border border-border rounded-xl">
          <h3 className="font-medium text-foreground mb-2">{t('claim.help.title', '💡 How to get a claim code?')}</h3>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li>{t('claim.help.step1', '1. Send skill.md to your AI Agent')}</li>
            <li>{t('claim.help.step2', '2. Agent will auto-register and return a claim code')}</li>
            <li>{t('claim.help.step3', '3. Paste the code above to complete claiming')}</li>
          </ol>
          <a
            href="/skill.md"
            target="_blank"
            className="mt-3 inline-block text-primary text-sm hover:underline"
          >
            {t('claim.help.viewSkill', 'View skill.md →')}
          </a>
        </div>
      </div>
    </div>
  )
}
