import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

export const CusScene5Submit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clickT = spring({ frame: frame - 60, fps, config: { damping: 14, stiffness: 220 } });
  const sending = frame > 80;
  const spin = (frame * 12) % 360;

  return (
    <BrowserScene
      url="notiproof.com/collect/cust-01-aB42xR"
      tag="Step 3 · Submit"
      heading="Ready to send"
      subtitle="One click. No follow-up emails. No spam."
    >
      <div style={{ maxWidth: 820 }}>
        <div style={{
          background: colors.card, borderRadius: 14, padding: 24, border: `1px solid ${colors.border}`,
          marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 25,
              background: "linear-gradient(135deg, #FCA5A5, #F472B6)",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: fonts.display, fontSize: 20, fontWeight: 700,
            }}>S</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: colors.ink }}>Sarah · Designer at Fernwood Bakery</div>
              <div style={{ color: "#F59E0B", fontSize: 16, letterSpacing: 1 }}>★★★★★</div>
            </div>
          </div>
          <div style={{ fontSize: 15, color: colors.inkSoft, lineHeight: 1.55, fontStyle: "italic" }}>
            "Their pour-overs are the best in the city. I drive 20 minutes out of my way every weekend."
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button style={{
            padding: "18px 56px", borderRadius: 12,
            background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
            color: "white", border: "none", fontSize: 17, fontWeight: 700, fontFamily: fonts.body,
            boxShadow: `0 14px 36px -10px ${colors.sky}88`,
            transform: `scale(${1 + clickT * 0.06})`,
            display: "flex", alignItems: "center", gap: 12,
            minWidth: 280, justifyContent: "center",
          }}>
            {sending ? (
              <>
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  border: "2.5px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white", transform: `rotate(${spin}deg)`,
                }} />
                Sending…
              </>
            ) : "Submit testimonial"}
          </button>
        </div>
      </div>
    </BrowserScene>
  );
};

export const CUS_SCENE5_DURATION = 240;
