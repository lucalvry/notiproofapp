import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";

const inter = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
const grotesk = loadSpaceGrotesk("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });

export const fonts = {
  body: inter.fontFamily,
  display: grotesk.fontFamily,
};

export const colors = {
  navy: "#0F3460",
  navyDeep: "#0A2347",
  sky: "#0EA5E9",
  skySoft: "#7DD3FC",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#94A3B8",
  ink: "#0F172A",
  inkSoft: "#475569",
  success: "#10B981",
  successSoft: "#D1FAE5",
};

export const SPRING = {
  snappy: { damping: 20, stiffness: 200, mass: 0.6 },
  smooth: { damping: 200 },
  bouncy: { damping: 12, stiffness: 180, mass: 0.7 },
};
