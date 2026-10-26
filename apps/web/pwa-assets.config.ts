// Icone e schermate di avvio dell'app installabile, generate da public/icon.svg: pnpm exec pwa-assets-generator
// Dopo la generazione, i link delle schermate di avvio iPhone vanno copiati in index.html.
import { AllAppleDeviceNames, createAppleSplashScreens, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const dark = { resizeOptions: { background: '#0B1A24' } };
const iPhones = AllAppleDeviceNames.filter((d) => d.startsWith('iPhone'));

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, ...dark, padding: 0.15 },
    apple: { ...minimal2023Preset.apple, ...dark, padding: 0 },
    appleSplashScreens: createAppleSplashScreens(
      {
        // logo grande come nella schermata di avvio HTML (84 px su uno schermo largo circa 390)
        padding: 0.78,
        ...dark,
        linkMediaOptions: { log: true, addMediaScreen: true },
        name: (landscape, size) => `splash/${landscape ? 'landscape' : 'portrait'}-${size.width}x${size.height}.png`,
      },
      iPhones,
    ),
  },
  images: ['public/icon.svg'],
});
