import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smarteco.app',
  appName: 'SMART.ECO',
  webDir: 'www',
  server: {
    url: 'https://smarteco26-ctrl.github.io/smarteco-app/',
    androidScheme: 'https',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
