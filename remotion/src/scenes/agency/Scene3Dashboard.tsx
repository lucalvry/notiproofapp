import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

const CLIENTS = [
  { name: "Acme Co", proof: 124, health: 92 },
  { name: "Beanly", proof: 87, health: 78 },
  { name: "Coral & Co", proof: 56, health: 64 },
  { name: "DraftBox", proof: 142, health: 88 },
  { name: "Evergrove", proof: 31, health: 42 },
];

export const AgyScene3Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <BrowserScene
      url="app.notiproof.com/agency"
      tag="Agency Dashboard"
      heading="Every client. One screen."
      subtitle="Proof collected, seats used, and a health league across your book."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Proof (30d)", value: "440", delta: "+12%" },
          { label: "Seats used", value: "24 / 30" },
          { label: "Active clients", value: "5" },
        ].map((s, i) => {
          const t = spring({ frame: frame - i * 6, fps, config: { damping: 18, stiffness: 160 } });
          return (
            <div key={s.label} style={{
              background: colors.card, borderRadius: 12, padding: 22,
              border: `1px solid ${colors.border}`,
              opacity: t, transform: `translateY(${interpolate(t, [0, 1], [16, 0])}px)`,
            }}>
              <div style={{ fontSize: 12, color: colors.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 36, fontWeight: 700, color: colors.ink }}>{s.value}</div>
                {s.delta && <div style={{ fontSize: 13, color: colors.success, fontWeight: 600 }}>{s.delta}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 22 }}>
        <div style={{ fontSize: 12, color: colors.muted, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>Client health league</div>
        {CLIENTS.map((c, i) => {
          const barT = spring({ frame: frame - (40 + i * 8), fps, config: { damping: 20, stiffness: 140 } });
          const w = interpolate(barT, [0, 1], [0, c.health]);
          const healthy = c.health > 70;
          return (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < CLIENTS.length - 1 ? `1px solid ${colors.border}` : "none" }}>
              <div style={{ width: 140, fontSize: 14, fontWeight: 600, color: colors.ink }}>{c.name}</div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: colors.bg, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${w}%`,
                  background: healthy ? colors.success : "#F59E0B",
                  borderRadius: 4,
                }} />
              </div>
              <div style={{ width: 50, textAlign: "right", fontSize: 13, color: colors.inkSoft, fontWeight: 600 }}>{c.health}</div>
              <div style={{ width: 90, textAlign: "right", fontSize: 12, color: colors.muted }}>{c.proof} proofs</div>
            </div>
          );
        })}
      </div>
    </BrowserScene>
  );
};

export const AGY_SCENE3_DURATION = 330;
