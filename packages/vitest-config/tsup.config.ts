import type { Options } from 'tsup'
import { isDevelopment } from 'std-env'

export const tsup: Options = {
  // splitting: true,
  sourcemap: true,
  clean: true, // rimraf disr
  dts: true, // generate dts file for main module
  format: ['cjs', 'esm'], // generate cjs and esm files
  // minify: env === "production",
  minify: false,
  treeshake: false,
  shims: false,
  bundle: false,
  skipNodeModulesBundle: true,
  watch: isDevelopment,
  outDir: 'dist',
  entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts', '!src/**/__tests__/**'],
}
