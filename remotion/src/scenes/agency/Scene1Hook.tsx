import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";

const CLIENTS = ["Acme Co", "Beanly", "Coral & Co", "DraftBox", "Evergrove"];

export const AgyScene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 5 browser windows collapse into one dashboard
  const collapseT = spring({ frame: frame - 30, fps, config: { damping: 22, stiffness: 90 } });
  const titleT = spring({ frame: frame - 60, fps, config: { damping: 22, stiffness: 140 } });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at 30% 20%, ${colors.navy} 0%, ${colors.navyDeep} 60%, #050B1E 100%)`,
      fontFamily: fonts.body, color: "white", overflow: "hidden",
    }}>
      {CLIENTS.map((c, i) => {
        const fromX = [200, 1400, 300, 1200, 700][i];
        const fromY = [120, 180, 600, 700, 100][i];
        const targetX = 960; const targetY = 540;
        const x = interpolate(collapseT, [0, 1], [fromX, targetX]);
        const y = interpolate(collapseT, [0, 1], [fromY, targetY]);
        const scale = interpolate(collapseT, [0, 1], [1, 0.12]);
        const opacity = interpolate(collapseT, [0.6, 1], [1, 0], { extrapolateRight: "clamp" });
        return (
          <div key={c} style={{
            position: "absolute", left: x, top: y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            width: 380, height: 240, borderRadius: 12,
            background: colors.card, color: colors.ink,
            border: `1px solid ${colors.border}`,
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.5)",
            opacity, padding: 16,
          }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "#FB7185" }} />
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "#FBBF24" }} />
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "#34D399" }} />
              <div style={{ flex: 1, fontSize: 11, color: colors.muted, paddingLeft: 8 }}>{c.toLowerCase().replace(/[^a-z]/g, "")}.analytics.com</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, fontFamily: fonts.display }}>{c}</div>
            <div style={{ fontSize: 12, color: colors.muted }}>Dashboard</div>
          </div>
        );
      })}

      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 80,
        opacity: titleT, transform: `translateY(${interpolate(titleT, [0, 1], [30, 0])}px)`,
      }}>
        <div style={{
          fontFamily: fonts.display, fontSize: 18, letterSpacing: 6,
          color: colors.skySoft, textTransform: "uppercase", marginBottom: 24,
        }}>NotiProof · For Agencies</div>
        <div style={{
          fontFamily: fonts.display, fontSize: 96, fontWeight: 700,
          lineHeight: 1.05, textAlign: "center", maxWidth: 1500,
        }}>
          Five logins.<br/><span style={{ color: colors.sky }}>One dashboard.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const AGY_SCENE1_DURATION = 270;
