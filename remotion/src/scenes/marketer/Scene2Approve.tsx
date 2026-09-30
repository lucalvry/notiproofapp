import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

export const MktScene2Approve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const approveT = spring({ frame: frame - 80, fps, config: { damping: 18, stiffness: 180 } });
  const genT = spring({ frame: frame - 110, fps, config: { damping: 16, stiffness: 160 } });

  const approved = approveT > 0.3;

  return (
    <BrowserScene
      url="app.notiproof.com/proof/12873"
      tag="Proof Library · CUST-94"
      heading="Sarah Chen · Acme Coffee"
      subtitle="Review the testimonial, then approve to unlock content generation."
    >
      <div style={{
        background: colors.card, borderRadius: 16, padding: 32, border: `1px solid ${colors.border}`,
        boxShadow: "0 10px 30px -10px rgba(15,52,96,0.15)", maxWidth: 920,
      }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 32,
            background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: fonts.display, fontSize: 26, fontWeight: 700,
          }}>S</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 600, color: colors.ink }}>Sarah Chen</div>
            <div style={{ fontSize: 14, color: colors.muted }}>Head of Ops · Acme Coffee</div>
          </div>
          <div style={{ color: "#F59E0B", fontSize: 24, letterSpacing: 2 }}>★★★★★</div>
        </div>
        <div style={{ fontSize: 21, lineHeight: 1.55, color: colors.ink, fontStyle: "italic" }}>
          "We rolled NotiProof out on a Friday and had 14 new reviews by Monday. It just keeps generating content from real activity — I haven't written a social post in weeks."
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 28, alignItems: "center" }}>
          <button style={{
            padding: "12px 24px", borderRadius: 10,
            background: approved ? colors.success : colors.navy, color: "white",
            border: "none", fontSize: 15, fontWeight: 600, fontFamily: fonts.body,
            transform: `scale(${1 + Math.max(0, approveT) * 0.04})`,
          }}>{approved ? "✓ Approved" : "Approve"}</button>
          <button style={{
            padding: "12px 22px", borderRadius: 10, background: "transparent",
            color: colors.inkSoft, border: `1px solid ${colors.border}`,
            fontSize: 15, fontFamily: fonts.body,
          }}>Reject</button>
          {genT > 0 && (
            <button style={{
              padding: "12px 22px", borderRadius: 10,
              background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
              color: "white", border: "none", fontSize: 15, fontWeight: 600,
              fontFamily: fonts.body, marginLeft: "auto",
              opacity: genT, transform: `translateX(${interpolate(genT, [0, 1], [60, 0])}px)`,
              boxShadow: `0 8px 20px -6px ${colors.sky}66`,
            }}>✨ Generate content →</button>
          )}
        </div>
      </div>
    </BrowserScene>
  );
};

export const MKT_SCENE2_DURATION = 240;
