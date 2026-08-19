import { useState } from 'react';
import { useJubyStore } from '../../../core/store/useJubyStore.js';
import { useTranslation } from '../../../hooks/useTranslation.js';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const login = useJubyStore((state) => state.login);
  const { t, lang, setLang } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('err_required');
      return;
    }

    const result = login(username, password);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-circle">🎱</div>
          <h1>{t('club_name') || 'Juby Club'}</h1>
          <div className="tagline">{t('tagline') || 'Billard & Snooker'}</div>
        </div>

        <div className="login-lang">
          <button 
            type="button" 
            className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} 
            onClick={() => setLang('fr')}
          >
            FR
          </button>
          <button 
            type="button" 
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`} 
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button 
            type="button" 
            className={`lang-btn ${lang === 'ar' ? 'active' : ''}`} 
            onClick={() => setLang('ar')}
          >
            العربية
          </button>
        </div>

        {error && (
          <div className="login-error">
            ⚠️ {t(error)}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">{t('username')}</label>
            <input 
              type="text" 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder={t('username')}
            />
          </div>

          <div className="field">
            <label htmlFor="password">{t('password')}</label>
            <input 
              type="password" 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '12px' }}>
            🔑 {t('login')}
          </button>
        </form>

        <div className="login-hint">
          {t('changePwdHint')}
        </div>
      </div>
    </div>
  );
}
