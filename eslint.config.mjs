import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test coverage output
    "coverage/**",
  ]),
  // Test file overrides
  {
    files: ["**/__tests__/**/*.ts", "**/__tests__/**/*.tsx", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      // Test wrapper components don't need displayName
      "react/display-name": "off",
      // Allow module variable assignment in tests for mocking
      "@next/next/no-assign-module-variable": "off",
      // Allow unused variables starting with underscore in tests
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Allow setState in useEffect for initialization patterns
  {
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      // Disable the strict set-state-in-effect rule
      // Initial state synchronization in useEffect is a valid pattern
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
