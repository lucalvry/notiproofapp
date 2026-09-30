import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

const RECS = [
  "Acme's Tuesday review-request flow converts 38% above benchmark — extend to wholesale customers.",
  "Three approved testimonials are unused — generate a LinkedIn carousel from the top two.",
  "Widget impressions dipped 12% on mobile — try the Compact variant on the product page.",
];

const BRAND = "#EC4899";

export const AgyScene6Report: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sendT = spring({ frame: frame - 160, fps, config: { damping: 14, stiffness: 200 } });

  return (
    <BrowserScene
      url="app.notiproof.com/agency/clients/acme/report"
      tag="Performance Report · Branded"
      heading="Acme Co. — November"
      subtitle="Your colours. AI-generated recommendations. Print or send from here."
    >
      <div style={{ position: "absolute", top: 24, right: 80, display: "flex", gap: 10 }}>
        <button style={{
          padding: "10px 18px", borderRadius: 8, background: colors.card,
          border: `1px solid ${colors.border}`, color: colors.inkSoft,
          fontSize: 13, fontWeight: 600,
        }}>Print / PDF</button>
        <button style={{
          padding: "10px 22px", borderRadius: 8,
          background: `linear-gradient(135deg, ${BRAND}, ${colors.navy})`,
          color: "white", border: "none", fontSize: 13, fontWeight: 600,
          transform: `scale(${1 + sendT * 0.06})`,
        }}>Send to client →</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Proof collected", value: "124" },
          { label: "Avg rating", value: "4.8" },
          { label: "Content pieces", value: "31" },
          { label: "Widget impressions", value: "18.4k" },
        ].map((s, i) => {
          const t = spring({ frame: frame - i * 6, fps, config: { damping: 18, stiffness: 160 } });
          return (
            <div key={s.label} style={{
              background: `${BRAND}10`, borderRadius: 12, padding: 20,
              border: `1px solid ${BRAND}30`,
              opacity: t, transform: `translateY(${interpolate(t, [0, 1], [14, 0])}px)`,
            }}>
              <div style={{ fontSize: 11, color: BRAND, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: 700, color: colors.ink, marginTop: 4 }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{
        background: colors.card, borderRadius: 12, padding: 24, border: `1px solid ${colors.border}`,
      }}>
        <div style={{ fontSize: 12, color: BRAND, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
          ✨ AI recommendations
        </div>
        {RECS.map((r, i) => {
          const t = spring({ frame: frame - (60 + i * 18), fps, config: { damping: 20, stiffness: 140 } });
          return (
            <div key={i} style={{
              display: "flex", gap: 14, padding: "12px 0",
              borderBottom: i < RECS.length - 1 ? `1px solid ${colors.border}` : "none",
              opacity: t, transform: `translateX(${interpolate(t, [0, 1], [-20, 0])}px)`,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 13, background: BRAND, color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ fontSize: 14, color: colors.ink, lineHeight: 1.5 }}>{r}</div>
            </div>
          );
        })}
      </div>
    </BrowserScene>
  );
};

export const AGY_SCENE6_DURATION = 330;
