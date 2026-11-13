import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lumomatch.game',
  appName: 'Lumo Match',
  webDir: 'dist',
  backgroundColor: '#101433',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never' },
};

export default config;
