import * as SecureStore from 'expo-secure-store';
import { I18nManager, DevSettings } from 'react-native';
import i18n from './index';

const LANGUAGE_KEY = 'language';

export const LANGUAGES = {
  fr: { code: 'fr', label: 'Français', rtl: false },
  ar: { code: 'ar', label: 'العربية', rtl: true },
};

// Applies a language on cold start, before the first render - RTL was
// already set on a previous run (see setLanguage), so this just makes sure
// i18next's active language matches what I18nManager is already rendering.
export async function loadStoredLanguage() {
  const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
  const lang = stored && LANGUAGES[stored] ? stored : 'fr';
  await i18n.changeLanguage(lang);
  return lang;
}

// Switching to/from Arabic flips text direction app-wide, which React
// Native only picks up on the next JS bundle load - the caller is
// responsible for prompting the user to restart when this returns true.
export async function setLanguage(lang) {
  await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);

  const shouldBeRTL = LANGUAGES[lang].rtl;
  const needsRestart = I18nManager.isRTL !== shouldBeRTL;
  if (needsRestart) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
  return needsRestart;
}

export function restartApp() {
  DevSettings.reload();
}
