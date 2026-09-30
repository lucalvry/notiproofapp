import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

export const CusScene2Land: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeT = spring({ frame: frame - 20, fps, config: { damping: 24, stiffness: 100 } });

  return (
    <BrowserScene
      url="notiproof.com/collect/cust-01-aB42xR"
      tag="CUST-01 · Private link"
      heading="Share your experience"
      subtitle="Your testimonial helps Acme Co. reach more people."
    >
      <div style={{ opacity: fadeT, maxWidth: 720 }}>
        <div style={{
          background: colors.card, borderRadius: 16, padding: 36,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 10px 30px -10px rgba(15,52,96,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 14,
              background: "#D97706", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: fonts.display, fontSize: 30, fontWeight: 700,
            }}>A</div>
            <div>
              <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 700, color: colors.ink }}>Acme Coffee</div>
              <div style={{ fontSize: 13, color: colors.muted }}>Requested by Sarah · Customer success</div>
            </div>
          </div>
          <div style={{
            background: colors.bg, borderRadius: 10, padding: 18,
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <div style={{ fontSize: 22 }}>🔒</div>
            <div style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 1.5 }}>
              <strong>No signup needed.</strong> This link is unique to you and expires after submission.
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: colors.sky }} />
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: colors.border }} />
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: colors.border }} />
          </div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>Step 1 of 3 · About 60 seconds</div>
        </div>
      </div>
    </BrowserScene>
  );
};

export const CUS_SCENE2_DURATION = 240;
