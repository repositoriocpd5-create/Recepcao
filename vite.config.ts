import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Gera o service worker da PWA a cada build: versão nova = atualização oferecida ao usuário.
const pwaServiceWorker = (): Plugin => ({
  name: 'smedu-pwa-service-worker',
  apply: 'build',
  generateBundle(_options, bundle) {
    const template = fs.readFileSync(path.resolve(__dirname, 'pwa/sw-template.js'), 'utf-8');
    // Só o app principal entra no pré-cache; bibliotecas carregadas sob demanda (PDF) entram no primeiro uso.
    const buildFiles = Object.values(bundle)
      .filter((item) => (item.type === 'chunk' && item.isEntry) || (item.type === 'asset' && item.fileName.endsWith('.css')))
      .map((item) => `/${item.fileName}`);
    const precache = [
      '/index.html',
      '/manifest.webmanifest',
      '/icons/icon-192.png?v=5',
      '/icons/icon-512.png?v=5',
      '/assets/brasao_itaguai.png',
      ...buildFiles,
    ];
    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: template
        .replace('__BUILD_VERSION__', new Date().toISOString())
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2)),
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), pwaServiceWorker()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Arquivos com hash ficam em /static (cache longo); /assets guarda imagens fixas do projeto.
    assetsDir: 'static',
  },
  server: {
    port: 3000,
    open: false,
    // Nesta unidade (E:) o aviso de arquivo alterado às vezes não chega e a tela fica com código antigo.
    watch: { usePolling: true, interval: 300 },
  },
});
