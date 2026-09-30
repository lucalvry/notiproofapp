import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { LogoLockup } from "../../components/LogoLockup";

export const MktScene7Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 20, stiffness: 140 } });
  const logoT = spring({ frame: frame - 30, fps, config: { damping: 18, stiffness: 140 } });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at 70% 80%, ${colors.navy} 0%, ${colors.navyDeep} 60%, #050B1E 100%)`,
      fontFamily: fonts.body, color: "white",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80,
    }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 36, opacity: t }}>
        {["Tone", "Words to use", "Words to avoid"].map((label, i) => (
          <div key={label} style={{
            background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px 28px",
            border: `1px solid ${colors.sky}33`, minWidth: 240,
            transform: `translateY(${interpolate(spring({ frame: frame - i * 6, fps, config: { damping: 22 } }), [0, 1], [30, 0])}px)`,
          }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, color: colors.skySoft, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 16 }}>
              {i === 0 ? "Casual, confident" : i === 1 ? "real, simple, honest" : "synergy, leverage"}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        fontFamily: fonts.display, fontSize: 80, fontWeight: 700, textAlign: "center",
        opacity: logoT, transform: `translateY(${interpolate(logoT, [0, 1], [30, 0])}px)`,
      }}>
        One testimonial.<br/>
        <span style={{ color: colors.sky }}>Zero blank pages.</span>
      </div>
      <div style={{ marginTop: 48, opacity: interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" }) }}>
        <LogoLockup size={48} />
      </div>
    </AbsoluteFill>
  );
};

export const MKT_SCENE7_DURATION = 240;
