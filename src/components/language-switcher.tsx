
"use client";

import { useI18n } from '@/context/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';


export function LanguageSwitcher({ as, className }: { as?: 'button' | 'dropdown', className?: string}) {
  const { locale, setLocale, t } = useI18n();

  const changeLanguage = (lang: 'bn' | 'en') => {
    setLocale(lang);
  };

  if(as === 'button') {
    return (
        <Button variant="ghost" size="icon" onClick={() => changeLanguage(locale === 'bn' ? 'en' : 'bn')} className={className}>
            <Languages className="h-5 w-5" />
            <span className="sr-only">{t('toggle_language')}</span>
        </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-6 w-6", className)}>
          <Languages />
          <span className="sr-only">{t('change_language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('bn')} disabled={locale === 'bn'}>
          বাংলা
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('en')} disabled={locale === 'en'}>
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
