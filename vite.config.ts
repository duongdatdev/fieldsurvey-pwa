import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function pwaAssetsInjector() {
  return {
    name: 'pwa-assets-injector',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const assetsDir = path.resolve(distDir, 'assets');
      const swPath = path.resolve(distDir, 'sw.js');

      if (!fs.existsSync(swPath) || !fs.existsSync(assetsDir)) {
        return;
      }

      const assetFiles = fs.readdirSync(assetsDir);
      const assetUrls = assetFiles
        .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
        .map((file) => `/assets/${file}`);

      let swContent = fs.readFileSync(swPath, 'utf-8');

      // Replace placeholder or inject into APP_SHELL_ASSETS
      if (swContent.includes('/* __BUILD_ASSETS__ */')) {
        const replacement = assetUrls.map((url) => `  '${url}',`).join('\n');
        swContent = swContent.replace('/* __BUILD_ASSETS__ */', replacement);
      } else {
        const target = 'const APP_SHELL_ASSETS = [';
        const injection = `${target}\n` + assetUrls.map((url) => `  '${url}',`).join('\n');
        swContent = swContent.replace(target, injection);
      }

      fs.writeFileSync(swPath, swContent, 'utf-8');
      console.log(`[PWA Plugin] Injected ${assetUrls.length} build assets into dist/sw.js:`, assetUrls);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), pwaAssetsInjector()],
  server: {
    port: 5173,
    host: true,
  },
});

