import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.casademusicacastillo.app',
  appName: 'Casa de Música Castillo',
  webDir: 'www',
  loggingBehavior: 'debug',
  android: { allowMixedContent: false },
  plugins: { SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'LIGHT' } }
};

export default config;
