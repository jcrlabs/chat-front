import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'net.jcrlabs.chat',
  appName: 'JCRLabs Chat',
  webDir: 'dist',
  server: {
    url: 'https://chat.jcrlabs.net',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e1f22',
    },
  },
}

export default config
