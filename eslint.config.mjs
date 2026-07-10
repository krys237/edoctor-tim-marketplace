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
    // Skills tierces vendorisees : leur code n'est pas le notre, et leurs
    // scripts .cjs declenchent no-require-imports. Ne pas les linter.
    ".claude/**",
    "design-system/**",
  ]),
]);

export default eslintConfig;
