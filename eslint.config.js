import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  // Global ignores
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/coverage/**",
    ],
  },
  // Base JS recommended config
  js.configs.recommended,

  // Config for scripts and backend JS/Node files (Node env)
  {
    files: [
      "scripts/**/*.mjs",
      "eslint.config.js",
      "eslint.config.mjs",
      "frontend/api/**/*.js",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },

  // Backend TypeScript / Node config
  {
    files: ["backend/src/**/*.ts", "backend/test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-undef": "off", // TypeScript compiler handles this better, avoids node global/module type conflicts
    },
  },

  // Frontend React / TypeScript config
  {
    files: ["frontend/src/**/*.{ts,tsx}", "frontend/e2e/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React 17+ / React 19 JSX transform
      "react/no-unescaped-entities": "off", // Allow unescaped quotes in JSX text
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn", // Allow any with warning for flexibility
      "@typescript-eslint/no-empty-object-type": "off", // Allow empty interfaces for React props extensions
      "no-undef": "off", // TypeScript handles this compile-time, prevents RequestInit/BodyInit errors
      "react-hooks/set-state-in-effect": "off", // Allow state updates in useEffect for mount-time checks
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
