import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { LogoLockup } from "../../components/LogoLockup";

export const CusScene6Thanks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const checkT = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const titleT = spring({ frame: frame - 20, fps, config: { damping: 22, stiffness: 140 } });
  const badgesT = spring({ frame: frame - 55, fps, config: { damping: 18, stiffness: 160 } });
  const logoT = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at 50% 40%, ${colors.navy} 0%, ${colors.navyDeep} 60%, #050B1E 100%)`,
      fontFamily: fonts.body, color: "white",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80,
    }}>
      {/* Confetti particles */}
      {Array.from({ length: 20 }).map((_, i) => {
        const startFrame = i * 2;
        const t = interpolate(frame, [startFrame, startFrame + 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const angle = (i / 20) * Math.PI * 2;
        const dist = 280 + (i % 4) * 60;
        const x = Math.cos(angle) * dist * t;
        const y = Math.sin(angle) * dist * t + t * t * 200;
        const colors2 = ["#0EA5E9", "#7DD3FC", "#10B981", "#F59E0B", "#EC4899"];
        return (
          <div key={i} style={{
            position: "absolute", left: "50%", top: "40%",
            width: 10, height: 10, borderRadius: 5,
            background: colors2[i % colors2.length],
            transform: `translate(${x}px, ${y}px) rotate(${frame * 4 + i * 30}deg)`,
            opacity: interpolate(t, [0, 0.6, 1], [1, 1, 0]),
          }} />
        );
      })}

      <div style={{
        width: 140, height: 140, borderRadius: 70,
        background: colors.success, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 70, color: "white", fontWeight: 700,
        transform: `scale(${checkT})`,
        boxShadow: `0 0 80px ${colors.success}88`,
      }}>✓</div>

      <div style={{
        fontFamily: fonts.display, fontSize: 80, fontWeight: 700, marginTop: 30,
        opacity: titleT, transform: `translateY(${interpolate(titleT, [0, 1], [20, 0])}px)`,
      }}>Thank you!</div>

      <div style={{
        fontSize: 22, color: "#CBD5E1", marginTop: 14, maxWidth: 700, textAlign: "center",
        opacity: titleT,
      }}>Your testimonial has been received. We really appreciate it.</div>

      <div style={{
        display: "flex", gap: 14, marginTop: 36,
        opacity: badgesT, transform: `translateY(${interpolate(badgesT, [0, 1], [20, 0])}px)`,
      }}>
        {["Photo saved ✓", "Video saved ✓"].map((b) => (
          <div key={b} style={{
            padding: "10px 18px", borderRadius: 999,
            background: "rgba(16,185,129,0.18)", color: "#A7F3D0",
            border: `1px solid ${colors.success}55`, fontSize: 14, fontWeight: 600,
          }}>{b}</div>
        ))}
      </div>

      <div style={{ marginTop: 56, opacity: logoT }}>
        <LogoLockup size={36} />
      </div>
    </AbsoluteFill>
  );
};

export const CUS_SCENE6_DURATION = 240;
