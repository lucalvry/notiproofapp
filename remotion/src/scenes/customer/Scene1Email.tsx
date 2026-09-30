import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";

const EMAILS = [
  { from: "GitHub", subject: "New pull request opened", time: "8:42 AM" },
  { from: "Acme Co.", subject: "We'd love to hear about your experience", time: "9:14 AM", highlight: true },
  { from: "Notion", subject: "Weekly digest: 4 mentions", time: "9:30 AM" },
  { from: "Stripe", subject: "Your weekly payout summary", time: "10:02 AM" },
];

export const CusScene1Email: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const openT = spring({ frame: frame - 70, fps, config: { damping: 22, stiffness: 100 } });
  // After frame 100, slide list left, reveal opened email
  const openedEmailT = spring({ frame: frame - 110, fps, config: { damping: 22, stiffness: 130 } });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at 30% 30%, ${colors.navy} 0%, ${colors.navyDeep} 60%, #050B1E 100%)`,
      fontFamily: fonts.body, color: "white",
      padding: 80, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 1100, height: 680, background: colors.card, borderRadius: 18,
        overflow: "hidden", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)",
        display: "flex", color: colors.ink,
      }}>
        {/* Inbox */}
        <div style={{
          flex: openedEmailT > 0 ? 0.3 : 1, background: "#F8FAFC", borderRight: `1px solid ${colors.border}`,
          transition: "flex 0.3s", overflow: "hidden",
        }}>
          <div style={{ padding: "18px 24px", borderBottom: `1px solid ${colors.border}`, fontFamily: fonts.display, fontWeight: 700, fontSize: 18 }}>
            Inbox
          </div>
          {EMAILS.map((e, i) => {
            const hover = e.highlight ? interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
            return (
              <div key={i} style={{
                padding: "14px 24px", borderBottom: `1px solid ${colors.border}`,
                background: e.highlight ? `${colors.sky}${Math.floor(hover * 25).toString(16).padStart(2, "0")}` : "transparent",
                borderLeft: e.highlight ? `3px solid ${colors.sky}` : "3px solid transparent",
                transform: `scale(${1 + hover * 0.015})`,
                transformOrigin: "left center",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <strong style={{ color: e.highlight ? colors.navy : colors.ink }}>{e.from}</strong>
                  <span style={{ color: colors.muted, fontSize: 11 }}>{e.time}</span>
                </div>
                <div style={{ fontSize: 13, color: colors.inkSoft, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.subject}
                </div>
              </div>
            );
          })}
        </div>
        {/* Opened email */}
        {openedEmailT > 0 && (
          <div style={{
            flex: 0.7, padding: 40, opacity: openedEmailT,
            transform: `translateX(${interpolate(openedEmailT, [0, 1], [40, 0])}px)`,
          }}>
            <div style={{ fontSize: 13, color: colors.muted }}>From Acme Co.</div>
            <div style={{ fontFamily: fonts.display, fontSize: 26, fontWeight: 700, color: colors.ink, marginTop: 6 }}>
              We'd love to hear about your experience
            </div>
            <div style={{ fontSize: 15, color: colors.inkSoft, marginTop: 18, lineHeight: 1.6 }}>
              Hi Sarah,<br/><br/>
              Thanks for choosing Acme. Could you take 60 seconds to share a quick testimonial? It really helps us grow.
            </div>
            <button style={{
              marginTop: 32, padding: "16px 32px", borderRadius: 12,
              background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
              color: "white", border: "none", fontSize: 16, fontWeight: 600,
              boxShadow: `0 10px 24px -8px ${colors.sky}66`,
              transform: `scale(${1 + Math.max(0, openT) * 0.04})`,
            }}>Share your experience →</button>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const CUS_SCENE1_DURATION = 270;
