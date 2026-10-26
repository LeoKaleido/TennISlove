// Icone dell'app installabile, generate da public/icon.svg: pnpm exec pwa-assets-generator
// Le schermate di avvio iPhone invece si fanno dal loader: pnpm splash (scripts/splash.mjs).
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const dark = { resizeOptions: { background: '#0B1A24' } };

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, ...dark, padding: 0.15 },
    apple: { ...minimal2023Preset.apple, ...dark, padding: 0 },
  },
  images: ['public/icon.svg'],
});
