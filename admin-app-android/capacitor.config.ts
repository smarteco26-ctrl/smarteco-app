import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smarteco.admin',
  appName: 'SMART.ECO Admin',
  webDir: 'www',
  server: {
    url: 'https://smarteco26-ctrl.github.io/smarteco-app/admin/login/index.html',
    androidScheme: 'https',
    cleartext: false
  }
};

export default config;
