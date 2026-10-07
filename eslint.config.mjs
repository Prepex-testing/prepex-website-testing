import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 15 existing screens load data with `useEffect(() => { void load() }, [])`. Behaviour is
      // correct; the rule is a React-compiler performance hint. Kept visible as a warning so new
      // code is still nudged, until those screens move to a data-fetching layer.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "e2e/.artifacts/**",
    "e2e/.shots/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
