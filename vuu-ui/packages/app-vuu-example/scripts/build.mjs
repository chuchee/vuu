import { build } from 'esbuild';
import { exec, formatBytes } from './utils.mjs';

const entryPoints = [
  'index.jsx',
  'features/filtered-grid.js',
  'features/metrics.js',
  'features/simple-component.js'
];
const outdir = 'public';

const stripOutdir = (file) => file.replace(RegExp(`^${outdir}\/`), '');

async function main() {
  const args = process.argv.slice(2);

  console.log('[CLEAN]');
  await exec("find -E public -regex '.*.(js|css)(.map)?$' -delete");

  const watch = args.includes('--watch');

  try {
    console.log('[BUILD]');
    const { metafile } = await build({
      bundle: true,
      entryPoints,
      format: 'esm',
      metafile: true,
      outdir,
      sourcemap: true,
      splitting: true,
      watch
    }).catch(() => process.exit(1));

    console.log('[DEPLOY worker.js]');
    await exec('cp ../../node_modules/@vuu-ui/data-worker/worker.js ./public/worker.js');
    await exec('cp ../../node_modules/@vuu-ui/data-worker/worker.js.map ./public/worker.js.map');

    entryPoints.forEach((fileName) => {
      const outJS = `${outdir}/${fileName.replace(/x$/, '')}`;
      const outCSS = outJS.replace(/js$/, 'css');
      const {
        outputs: { [outJS]: jsOutput, [outCSS]: cssOutput }
      } = metafile;
      console.log(`\t${stripOutdir(outJS)}:  ${formatBytes(jsOutput.bytes)}`);
      if (cssOutput) {
        console.log(`\t${stripOutdir(outCSS)}: ${formatBytes(cssOutput.bytes)}`);
      }
    });
  } catch (error) {
    console.error(error);
    process.exit((error && error.code) || 1); // properly exit with error code (useful for CI or chaining)
  }
}

main();