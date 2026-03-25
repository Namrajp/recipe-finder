'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ne', label: 'नेपाली', flag: '🇳🇵' },
];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{t.language}:</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`
              px-3 py-1.5 text-sm font-medium transition-colors
              ${language === lang.code
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
            aria-label={`Switch to ${lang.label}`}
          >
            <span className="mr-1">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
