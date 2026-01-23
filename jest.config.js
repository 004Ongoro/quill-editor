module.exports = {
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.js"],
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/test/**",
    "!**/dist/**",
    "!**/scripts/**",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
