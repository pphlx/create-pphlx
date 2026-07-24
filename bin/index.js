#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${ANSI.bold}${ANSI.cyan}create-pphlx v1.0.0${ANSI.reset}
Scaffold a new PPHLX Monolithic PHP Application in seconds.

${ANSI.bold}Usage:${ANSI.reset}
  npm create pphlx@latest [project-directory]
  npx create-pphlx [project-directory]

${ANSI.bold}Examples:${ANSI.reset}
  npm create pphlx@latest my-app
  npx create-pphlx ./
`);
    process.exit(0);
  }

  let targetDir = args.find(a => !a.startsWith('-')) || 'my-pphlx-app';
  const projectDir = path.resolve(process.cwd(), targetDir);
  const projectName = path.basename(projectDir);

  console.log(`\n${ANSI.bold}${ANSI.magenta}🚀 Creating PPHLX project in ${ANSI.cyan}${projectDir}${ANSI.reset}...\n`);

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // 1. package.json
  const packageJsonPath = path.join(projectDir, 'package.json');
  let packageJson = {
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'commonjs',
    scripts: {
      dev: 'pphlx dev',
      start: 'pphlx dev',
      build: 'pphlx',
      watch: 'pphlx watch',
      preview: 'pphlx preview',
      check: 'pphlx check'
    },
    dependencies: {
      pphlx: '^1.1.0'
    }
  };

  if (fs.existsSync(packageJsonPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      existing.scripts = { ...existing.scripts, ...packageJson.scripts };
      existing.dependencies = { pphlx: '^1.1.0', ...(existing.dependencies || {}) };
      packageJson = existing;
    } catch (e) {}
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log(`  ${ANSI.green}✓${ANSI.reset} Configured package.json scripts & dependencies`);

  // 2. pphlx.json (Project Manifest)
  const pphlxJsonPath = path.join(projectDir, 'pphlx.json');
  if (!fs.existsSync(pphlxJsonPath)) {
    const pphlxJson = {
      name: projectName,
      version: '1.0.0',
      description: 'PPHLX Monolithic Web Application',
      scripts: {
        build: 'pphlx build',
        dev: 'pphlx dev',
        watch: 'pphlx watch'
      },
      dependencies: {
        pphlx: '^1.1.0'
      }
    };
    fs.writeFileSync(pphlxJsonPath, JSON.stringify(pphlxJson, null, 2), 'utf8');
    console.log(`  ${ANSI.green}✓${ANSI.reset} Created pphlx.json (Project Manifest)`);
  }

  // 3. pphlx.config.json (Compiler Config)
  const pphlxConfigJsonPath = path.join(projectDir, 'pphlx.config.json');
  if (!fs.existsSync(pphlxConfigJsonPath)) {
    const pphlxConfig = {
      srcDir: '.',
      outDir: 'dist',
      cssOut: 'dist/css/styles.css',
      jsOut: 'dist/js/bundle.js',
      output: {
        target: 'php'
      }
    };
    fs.writeFileSync(pphlxConfigJsonPath, JSON.stringify(pphlxConfig, null, 2), 'utf8');
    console.log(`  ${ANSI.green}✓${ANSI.reset} Created pphlx.config.json (Compiler Config)`);
  }

  // 4. pphlx.vite.config.mjs (Vite Bridge Config)
  const pphlxViteConfigPath = path.join(projectDir, 'pphlx.vite.config.mjs');
  if (!fs.existsSync(pphlxViteConfigPath)) {
    const viteConfigContent = `import { defineConfig } from 'vite';
import pphlx from 'pphlx/vite';

export default defineConfig({
  plugins: [pphlx()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
`;
    fs.writeFileSync(pphlxViteConfigPath, viteConfigContent, 'utf8');
    console.log(`  ${ANSI.green}✓${ANSI.reset} Created pphlx.vite.config.mjs (Vite Bridge Config)`);
  }

  // 5. Scaffold layouts/ Layout.pphx
  const layoutsDir = path.join(projectDir, 'layouts');
  if (!fs.existsSync(layoutsDir)) {
    fs.mkdirSync(layoutsDir, { recursive: true });
  }
  const layoutPath = path.join(layoutsDir, 'Layout.pphx');
  if (!fs.existsSync(layoutPath)) {
    const layoutContent = `{|
if (!defined('PPHLX_EXEC')) {
    define('PPHLX_EXEC', true);
}
$_title = !empty($title) ? $title : 'PPHLX Monolith App';
|}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{|= $_title; |}</title>
    {{PPHLX_CSS}}
</head>
<body>
    <main>
        {{slot}}
    </main>
    {{PPHLX_JS}}
</body>
</html>
`;
    fs.writeFileSync(layoutPath, layoutContent, 'utf8');
    console.log(`  ${ANSI.green}✓${ANSI.reset} Created layouts/Layout.pphx`);
  }

  // 6. Scaffold components/ directory
  const componentsDir = path.join(projectDir, 'components');
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
    console.log(`  ${ANSI.green}✓${ANSI.reset} Created components/ directory`);
  }

  // 7. Scaffold root index.pphx
  const indexPath = path.join(projectDir, 'index.pphx');
  if (!fs.existsSync(indexPath)) {
    const indexContent = `@import Layout from './layouts/Layout.pphx'

<Layout title="Welcome to PPHLX App">
    <div style="font-family:sans-serif;padding:40px;text-align:center;">
        <h1>🚀 Welcome to PPHLX Monolith</h1>
        <p>Zero Node.js runtime in production. Standalone PHP template execution.</p>
    </div>
</Layout>
`;
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log(`  ${ANSI.green}✓${ANSI.reset} Created root index.pphx template`);
  }

  // 8. Scaffold .gitignore
  const gitignorePath = path.join(projectDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = `node_modules/
dist/
.DS_Store
*.log
`;
    fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
    console.log(`  ${ANSI.green}✓${ANSI.reset} Created .gitignore`);
  }

  // Next steps instructions
  const isCurrentDir = projectDir === process.cwd();
  console.log(`\n${ANSI.bold}${ANSI.green}🎉 PPHLX project initialized successfully!${ANSI.reset}\n`);
  console.log(`${ANSI.bold}Next steps:${ANSI.reset}`);

  if (!isCurrentDir) {
    console.log(`  ${ANSI.cyan}cd ${targetDir}${ANSI.reset}`);
  }
  console.log(`  ${ANSI.cyan}npm install${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}npm run dev${ANSI.reset}\n`);
}

main();
