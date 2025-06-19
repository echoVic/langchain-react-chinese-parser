import { defineConfig } from 'tsup';

export default defineConfig([
  // CommonJS build
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    external: ['@langchain/core'],
    outDir: 'dist',
    target: 'es2020',
    banner: {
      js: '// langchain-react-chinese-parser - Chinese LLM ReAct Output Parsers for LangChain',
    },
  },
  // ESM build
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: false,
    external: ['@langchain/core'],
    outDir: 'dist',
    target: 'es2020',
    banner: {
      js: '// langchain-react-chinese-parser - Chinese LLM ReAct Output Parsers for LangChain',
    },
    outExtension() {
      return {
        js: '.mjs',
      };
    },
  },
]);
