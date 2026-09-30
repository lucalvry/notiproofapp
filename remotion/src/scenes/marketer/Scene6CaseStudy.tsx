import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

const MARKDOWN = `# How Acme Coffee 10x'd Reviews in 30 Days

## The Challenge
Acme Coffee had thousands of happy customers but almost no public reviews. Their team spent hours each week chasing testimonials manually.

## The Solution
Within a week of installing NotiProof, every Shopify order triggered a personalised review request. Approvals flowed into a single library.

## The Result
Over a 30-day window, Acme Coffee's review volume grew 10x. The marketing team turned the best reviews into a quarterly campaign.

> "We rolled NotiProof out on a Friday and had 14 new reviews by Monday."
> — Sarah Chen, Head of Ops

## What's next
Acme is now testing case-study generation for their wholesale program.`;

export const MktScene6CaseStudy: React.FC = () => {
  const frame = useCurrentFrame();
  const typeProgress = interpolate(frame, [30, 270], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const visibleChars = Math.floor(MARKDOWN.length * typeProgress);
  const visible = MARKDOWN.slice(0, visibleChars);
  const exportT = interpolate(frame, [275, 290], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <BrowserScene
      url="app.notiproof.com/case-studies/generate"
      tag="Case Study Generator"
      heading="Stack proofs into a full story"
      subtitle="Pick the testimonials. Choose a length. Watch it write live."
    >
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {["Sarah Chen", "Marcus Reid", "Priya Patel", "Tom Becker"].map((n, i) => (
            <label key={n} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: 12, borderRadius: 8, background: colors.card,
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                background: i < 3 ? colors.sky : colors.card,
                border: `1.5px solid ${i < 3 ? colors.sky : colors.border}`,
                color: "white", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
              }}>{i < 3 ? "✓" : ""}</div>
              <span style={{ fontSize: 13, color: colors.ink }}>{n}</span>
            </label>
          ))}
          <div style={{ marginTop: 14, fontSize: 12, color: colors.muted, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Length</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Short", "Medium", "Long"].map((l, i) => (
              <div key={l} style={{
                flex: 1, padding: "8px 4px", borderRadius: 6, textAlign: "center",
                background: i === 1 ? colors.navy : colors.card, color: i === 1 ? "white" : colors.inkSoft,
                fontSize: 12, fontWeight: 600,
                border: i === 1 ? "none" : `1px solid ${colors.border}`,
              }}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{
          background: colors.card, borderRadius: 12, padding: 28,
          border: `1px solid ${colors.border}`, minHeight: 420, position: "relative",
          fontFamily: fonts.body, fontSize: 14, lineHeight: 1.65, color: colors.ink,
          whiteSpace: "pre-wrap", overflow: "hidden",
        }}>
          {visible}
          {typeProgress < 1 && <span style={{ opacity: 0.6 }}>▍</span>}
          {exportT > 0 && (
            <div style={{
              position: "absolute", top: 16, right: 16,
              background: colors.navy, color: "white", padding: "8px 16px", borderRadius: 8,
              fontSize: 13, fontWeight: 600, opacity: exportT,
              transform: `translateY(${interpolate(exportT, [0, 1], [-10, 0])}px)`,
            }}>↓ Export PDF</div>
          )}
        </div>
      </div>
    </BrowserScene>
  );
};

export const MKT_SCENE6_DURATION = 330;
