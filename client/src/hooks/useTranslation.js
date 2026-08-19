import { useJubyStore } from '../core/store/useJubyStore.js';
import { I18N } from '../core/i18n/translations.js';

export function useTranslation() {
  const currentLang = useJubyStore((state) => state.currentLang);
  const setLang = useJubyStore((state) => state.setLang);

  const t = (key) => {
    return I18N[currentLang]?.[key] || I18N.fr?.[key] || key;
  };

  const isRTL = currentLang === 'ar';

  return { 
    t, 
    lang: currentLang, 
    setLang, 
    isRTL, 
    dir: isRTL ? 'rtl' : 'ltr' 
  };
}
