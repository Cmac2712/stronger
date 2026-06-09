module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/.sandcastle/"],
  transformIgnorePatterns: [
    "node_modules/(?!(node_modules|.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@supabase|react-native-url-polyfill))",
  ],
};
