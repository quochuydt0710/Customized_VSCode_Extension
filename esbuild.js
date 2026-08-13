const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const mockOnnxPlugin = {
	name: 'mock-onnx',
	setup(build) {
		build.onResolve({ filter: /^(onnxruntime-node|sharp)$/ }, args => ({
			path: args.path,
			namespace: 'mock-onnx-ns',
		}));
		build.onLoad({ filter: /.*/, namespace: 'mock-onnx-ns' }, () => ({
			contents: 'module.exports = {};',
			loader: 'js',
		}));
	},
};

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',
	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	const extensionCtx = await esbuild.context({
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		target: 'node16',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin, mockOnnxPlugin],
		define: {
			'import.meta.url': 'import_meta_url'
		},
		banner: {
			js: "const import_meta_url = typeof require !== 'undefined' ? require('url').pathToFileURL(__filename).href : '';"
		}
	});

	const webviewCtx = await esbuild.context({
		entryPoints: ['src/webview/index.tsx'],
		bundle: true,
		format: 'iife',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'browser',
		outfile: 'dist/webview.js',
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	});

	if (watch) {
		await extensionCtx.watch();
		await webviewCtx.watch();
	} else {
		await extensionCtx.rebuild();
		await extensionCtx.dispose();
		await webviewCtx.rebuild();
		await webviewCtx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
