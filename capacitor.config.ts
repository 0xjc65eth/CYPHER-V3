import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cypher.ordifuture',
  appName: 'CYPHER ORDI FUTURE',
  webDir: 'out',
  server: {
    // In development, point to the Next.js dev server
    // Comment this out for production builds
    url: 'http://localhost:4444',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: true,
      spinnerColor: '#F7931A',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a1a',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'CYPHER',
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: true,
    captureInput: true,
  },
}

export default config
