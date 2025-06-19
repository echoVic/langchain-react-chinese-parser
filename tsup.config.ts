import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
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
});
