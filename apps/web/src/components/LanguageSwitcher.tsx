import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    // Easy to add more languages:
    // { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    const handleSelect = (code: string) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger button - same style as ThemeToggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={currentLang.label}
                aria-label="Select language"
                aria-expanded={isOpen}
            >
                <Globe className="w-5 h-5" />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-lg overflow-hidden z-50">
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors cursor-pointer ${lang.code === i18n.language
                                ? 'bg-muted/50 text-foreground'
                                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                                }`}
                        >
                            <span className="text-base">{lang.flag}</span>
                            <span>{lang.label}</span>
                            {lang.code === i18n.language && (
                                <span className="ml-auto text-purple-400 text-xs">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
