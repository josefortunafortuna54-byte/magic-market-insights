import 'i18next';
import pt from './locales/pt.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof pt };
  }
}
