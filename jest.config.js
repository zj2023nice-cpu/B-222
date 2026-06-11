module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js", "**/tests/**/*.test.js"],
  moduleFileExtensions: ["js"],
  collectCoverageFrom: [
    "utils/**/*.js",
    "pages/**/appointmentPure.js",
    "!**/node_modules/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
};
