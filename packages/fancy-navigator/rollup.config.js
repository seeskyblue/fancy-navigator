import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
// import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import postcssPresetEnv from 'postcss-preset-env';

import pkg from './package.json';

const extensions = ['.ts', '.tsx'];
const babelRuntimeVersion = pkg.dependencies['@babel/runtime'].replace(/^[^0-9]*/, '');

const makeExternalPredicate = (externalArr) => {
  if (externalArr.length === 0) {
    return () => false;
  }
  const pattern = new RegExp(`^(${externalArr.join('|')})($|/)`);
  return (id) => pattern.test(id);
};

const options = [
  { file: 'lib/fancy-navigator.js', format: 'cjs', indent: false },
  { file: 'es/fancy-navigator.js', format: 'es', indent: false },
].map((output) => ({
  input: 'index.ts',
  output,
  external: makeExternalPredicate([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ]),
  plugins: [
    nodeResolve(),
    // typescript({ tsconfig: '../../tsconfig.json' }),
    babel({
      extensions,
      plugins: [['@babel/plugin-transform-runtime', { version: babelRuntimeVersion }]],
      babelHelpers: 'runtime',
    }),
    postcss({
      extract: true,
      minimize: true,
      // modules: true,
      plugins: [postcssPresetEnv()],
      sourceMap: true,
    }),
  ],
}));

console.debug(options);

export default options;
