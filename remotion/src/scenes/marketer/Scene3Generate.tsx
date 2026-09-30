import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

const TONES = ["Professional", "Casual", "Witty", "Bold", "Inspirational"];
const PIECES = [
  { type: "Twitter", text: "We rolled NotiProof out Friday — 14 new reviews by Monday. Social proof on autopilot. 🚀" },
  { type: "LinkedIn", text: "Marketing teams underestimate how much content is hiding inside their happy customers..." },
  { type: "Email Subject", text: "How Acme Coffee got 14 reviews in a weekend" },
  { type: "Ad Headline", text: "Stop writing social posts. Start approving them." },
  { type: "Ad Body", text: "NotiProof turns every approved review into 8 pieces of on-brand content." },
  { type: "Website Quote", text: "\"I haven't written a social post in weeks.\" — Sarah, Acme Coffee" },
  { type: "Short Caption", text: "Real reviews. Real content. Zero blank pages." },
  { type: "Meta Description", text: "Acme Coffee uses NotiProof to turn customer reviews into a month of marketing content." },
];

export const MktScene3Generate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const toneIdx = 1; // Casual selected
  const genStart = 50;
  const clickT = spring({ frame: frame - 40, fps, config: { damping: 14, stiffness: 200 } });

  return (
    <BrowserScene
      url="app.notiproof.com/content/generate/12873"
      tag="Content Generator"
      heading="Generate all content"
      subtitle="Pick a tone, hit generate — eight pieces in ~20 seconds."
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {TONES.map((t, i) => (
          <div key={t} style={{
            padding: "10px 18px", borderRadius: 999,
            border: `1.5px solid ${i === toneIdx ? colors.sky : colors.border}`,
            background: i === toneIdx ? `${colors.sky}11` : colors.card,
            color: i === toneIdx ? colors.navy : colors.inkSoft,
            fontSize: 14, fontWeight: 600,
          }}>{t}</div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{
          padding: "10px 22px", borderRadius: 10,
          background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
          color: "white", fontSize: 14, fontWeight: 600,
          transform: `scale(${1 + clickT * 0.05})`,
          boxShadow: `0 8px 20px -6px ${colors.sky}66`,
        }}>✨ Generate all content</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {PIECES.map((p, i) => {
          const cardT = spring({ frame: frame - (genStart + i * 8), fps, config: { damping: 18, stiffness: 160 } });
          const typeProgress = interpolate(frame, [genStart + i * 8 + 4, genStart + i * 8 + 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const visibleChars = Math.floor(p.text.length * typeProgress);
          return (
            <div key={p.type} style={{
              background: colors.card, borderRadius: 12, padding: 16,
              border: `1px solid ${colors.border}`, minHeight: 140,
              opacity: cardT, transform: `translateY(${interpolate(cardT, [0, 1], [14, 0])}px)`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.sky, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {p.type}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: colors.ink }}>
                {p.text.slice(0, visibleChars)}
                {visibleChars < p.text.length && cardT > 0.5 && <span style={{ opacity: 0.6 }}>▍</span>}
              </div>
            </div>
          );
        })}
      </div>
    </BrowserScene>
  );
};

export const MKT_SCENE3_DURATION = 420;
