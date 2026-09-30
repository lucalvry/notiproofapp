import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

const DRAFTS = [
  "We rolled NotiProof out Friday — 14 new reviews by Monday.",
  "Marketing teams underestimate how much content is hiding…",
  "How Acme Coffee got 14 reviews in a weekend",
  "Stop writing social posts. Start approving them.",
  "Real reviews. Real content. Zero blank pages.",
];

export const MktScene4Bulk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Approvals at frame 50, 95, 140
  const approvedCount = frame > 140 ? 3 : frame > 95 ? 2 : frame > 50 ? 1 : 0;
  const activeIdx = Math.min(approvedCount, DRAFTS.length - 1);

  const keys = ["J", "K", "A", "R"];
  const pulses = [80, 100, 50, 130]; // when each key pulses

  return (
    <BrowserScene
      url="app.notiproof.com/content/review"
      tag="Bulk Review"
      heading="Clear it like an inbox"
      subtitle="J · K to move · A to approve · R to reject. Keyboard-only, takes minutes."
    >
      <div style={{ display: "flex", gap: 32 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {DRAFTS.map((text, i) => {
            const isActive = i === activeIdx;
            const isApproved = i < approvedCount;
            const slideT = spring({ frame: frame - (50 + i * 45), fps, config: { damping: 20, stiffness: 200 } });
            return (
              <div key={i} style={{
                background: colors.card, borderRadius: 12, padding: 20,
                border: `2px solid ${isActive ? colors.sky : isApproved ? colors.success : colors.border}`,
                boxShadow: isActive ? `0 0 0 4px ${colors.sky}22` : "none",
                opacity: isApproved ? 0.55 : 1,
                transform: isApproved ? `translateX(${interpolate(slideT, [0, 1], [0, -10])}px)` : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: 1 }}>
                    {isApproved ? "✓ APPROVED" : isActive ? "REVIEWING" : "QUEUED"}
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted }}>TWITTER</div>
                </div>
                <div style={{ fontSize: 16, color: colors.ink, marginTop: 8, lineHeight: 1.4 }}>{text}</div>
              </div>
            );
          })}
        </div>
        <div style={{
          width: 260, height: "fit-content", background: colors.navyDeep, color: "white",
          borderRadius: 14, padding: 24, fontFamily: fonts.body,
        }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: colors.skySoft, marginBottom: 16, fontWeight: 600 }}>HOTKEYS</div>
          {keys.map((k, i) => {
            const pulse = interpolate(frame, [pulses[i], pulses[i] + 8, pulses[i] + 22], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: pulse > 0 ? colors.sky : "rgba(255,255,255,0.1)",
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontFamily: fonts.display, fontSize: 18,
                  transform: `scale(${1 + pulse * 0.15})`,
                }}>{k}</div>
                <div style={{ fontSize: 13, color: "#CBD5E1" }}>
                  {k === "J" ? "↓ Next" : k === "K" ? "↑ Previous" : k === "A" ? "Approve" : "Reject"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BrowserScene>
  );
};

export const MKT_SCENE4_DURATION = 270;
