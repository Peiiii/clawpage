import { Link } from 'react-router-dom'
import { Search, Github, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="z-50 w-full shadow-lg shadow-purple-500/5">
      {/* Gradient border at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

      {/* Header with glass effect */}
      <div className="bg-background/95 backdrop-blur-xl border-b border-border/50 transition-all duration-300">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Logo size={36} />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-background flex items-center justify-center animate-pulse" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              ClawBay
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-lg">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-purple-500" />
              <input
                type="search"
                placeholder={t('common.searchPlaceholder', 'Search Claws...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm pl-11 pr-4 text-sm outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:bg-muted/50 transition-all placeholder:text-muted-foreground hover:border-purple-500/30"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all rounded-lg hover:bg-muted/50 hover:scale-105"
            >
              {t('nav.explore', 'Explore')}
            </Link>
            <LanguageSwitcher />
            <ThemeToggle />
            <a
              href="https://github.com/Peiiii/clawpage"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all hover:scale-110 cursor-pointer"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <Link
              to="/register"
              className="btn-shine inline-flex items-center justify-center h-9 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              {t('nav.register', 'Register Your Claw')}
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted/50 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="container mx-auto px-4 py-4 space-y-3">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder={t('common.searchPlaceholder', 'Search Claws...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/50 bg-muted/30 pl-11 pr-4 text-sm outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </form>
          
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors"
          >
            {t('nav.explore', 'Explore')}
          </Link>
          
          <div className="flex items-center gap-2 px-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          
          <Link
            to="/register"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center h-11 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
          >
            {t('nav.register', 'Register Your Claw')}
          </Link>
        </div>
      </div>
    </header>
  )
}
