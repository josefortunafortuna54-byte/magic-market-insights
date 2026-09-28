module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-i18next|@expo/vector-icons)',
  ],
  moduleNameMapper: {
    // Ordem importa: a regra dos assets tem de preceder a regra geral, senao
    // '@/assets/x.png' e resolvido como 'src/assets/x.png'. Espelha os `paths`
    // do tsconfig.json.
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
