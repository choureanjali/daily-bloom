
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dailybloom.app",
  appName: "Daily Bloom",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
