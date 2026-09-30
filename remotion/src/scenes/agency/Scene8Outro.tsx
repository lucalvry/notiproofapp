import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { LogoLockup } from "../../components/LogoLockup";

export const AgyScene8Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 20, stiffness: 140 } });
  const logoT = spring({ frame: frame - 35, fps, config: { damping: 18, stiffness: 140 } });

  const members = [
    { name: "Alex K.", role: "Owner", clients: 5 },
    { name: "Priya N.", role: "Manager", clients: 3 },
    { name: "Jordan W.", role: "Editor", clients: 2 },
  ];

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at 70% 80%, ${colors.navy} 0%, ${colors.navyDeep} 60%, #050B1E 100%)`,
      fontFamily: fonts.body, color: "white",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80,
    }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 40, opacity: t }}>
        {members.map((m, i) => {
          const it = spring({ frame: frame - i * 6, fps, config: { damping: 22 } });
          return (
            <div key={m.name} style={{
              background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 24px",
              border: `1px solid ${colors.sky}33`, minWidth: 220,
              transform: `translateY(${interpolate(it, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                }}>{m.name[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: colors.skySoft }}>{m.role}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#CBD5E1" }}>{m.clients} clients</div>
            </div>
          );
        })}
      </div>
      <div style={{
        fontFamily: fonts.display, fontSize: 80, fontWeight: 700, textAlign: "center",
        opacity: logoT, transform: `translateY(${interpolate(logoT, [0, 1], [30, 0])}px)`,
      }}>
        Every brand.<br/><span style={{ color: colors.sky }}>From one place.</span>
      </div>
      <div style={{ marginTop: 44, opacity: interpolate(frame, [65, 95], [0, 1], { extrapolateRight: "clamp" }) }}>
        <LogoLockup size={48} />
      </div>
    </AbsoluteFill>
  );
};

export const AGY_SCENE8_DURATION = 240;
