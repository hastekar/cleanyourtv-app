import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.magnificentmatch.game',
  appName: 'Magnificent Match',
  webDir: 'dist',
  backgroundColor: '#120b3a',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never' },
};

export default config;
