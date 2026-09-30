import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

const BRAND = "#EC4899";

export const AgyScene7Portal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <BrowserScene
      url="portal.brightlanestudio.com"
      tag="WHITE-LABEL CLIENT PORTAL"
      heading="Welcome, Acme Co."
      subtitle="Your agency's brand. Top to bottom. No NotiProof anywhere."
      bg={`linear-gradient(135deg, #FDF2F8 0%, ${BRAND}22 100%)`}
    >
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28 }}>
        <div style={{
          background: colors.card, borderRadius: 12, padding: 18,
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 22,
            paddingBottom: 14, borderBottom: `1px solid ${colors.border}`,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: `linear-gradient(135deg, ${BRAND}, ${colors.navy})` }} />
            <div style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.ink }}>Bright Lane</div>
          </div>
          {["Proof", "Content", "Analytics", "Settings"].map((item, i) => (
            <div key={item} style={{
              padding: "10px 12px", borderRadius: 8, marginBottom: 4,
              background: i === 2 ? `${BRAND}15` : "transparent",
              color: i === 2 ? BRAND : colors.inkSoft,
              fontSize: 14, fontWeight: i === 2 ? 600 : 500,
            }}>{item}</div>
          ))}
        </div>

        <div style={{
          background: colors.card, borderRadius: 12, padding: 24, border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 700, color: colors.ink, marginBottom: 18 }}>
            Analytics · November
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 200, padding: "12px 0" }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const target = 40 + Math.sin(i * 0.7) * 30 + i * 6;
              const t = spring({ frame: frame - (20 + i * 4), fps, config: { damping: 18, stiffness: 140 } });
              const h = interpolate(t, [0, 1], [0, target]);
              return (
                <div key={i} style={{
                  flex: 1, height: `${h}%`, background: `linear-gradient(to top, ${BRAND}, ${BRAND}88)`,
                  borderRadius: 4,
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 14, fontSize: 12, color: colors.muted }}>
            <div><strong style={{ color: BRAND }}>● </strong>Impressions</div>
            <div>18,402 this month · +24%</div>
          </div>
        </div>
      </div>
    </BrowserScene>
  );
};

export const AGY_SCENE7_DURATION = 330;
