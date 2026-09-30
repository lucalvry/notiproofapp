import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";

export const AgyScene5WorkAsClient: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const bannerGlow = interpolate(Math.sin(frame / 12), [-1, 1], [0.3, 0.7]);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${colors.bg} 0%, #E0F2FE 100%)`,
      padding: 80, fontFamily: fonts.body,
    }}>
      <div style={{ width: "100%", height: "100%", opacity: enterT, transform: `translateY(${interpolate(enterT, [0, 1], [50, 0])}px)` }}>
        <BrowserChrome url="app.notiproof.com/agency/clients/acme">
          {/* Active client banner */}
          <div style={{
            background: `linear-gradient(90deg, ${colors.navy}, ${colors.sky})`,
            color: "white", padding: "14px 32px",
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: `0 0 30px ${colors.sky}${Math.floor(bannerGlow * 90).toString(16)}`,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: colors.success }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Active client: <strong>Acme Co.</strong></div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 13, opacity: 0.85, textDecoration: "underline" }}>Exit client →</div>
          </div>

          <div style={{ padding: "40px 56px" }}>
            <div style={{ fontFamily: fonts.display, fontSize: 36, fontWeight: 700, color: colors.ink, marginBottom: 24 }}>
              Acme Co. workspace
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              {["Proof Library", "Content Hub", "Widgets", "Analytics"].map((tab, i) => (
                <div key={tab} style={{
                  padding: "10px 18px", borderRadius: 8,
                  background: i === 0 ? colors.navy : colors.card,
                  color: i === 0 ? "white" : colors.inkSoft,
                  fontSize: 14, fontWeight: 600,
                  border: i === 0 ? "none" : `1px solid ${colors.border}`,
                }}>{tab}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => {
                const t = spring({ frame: frame - (30 + i * 6), fps, config: { damping: 18, stiffness: 160 } });
                return (
                  <div key={i} style={{
                    background: colors.card, borderRadius: 12, padding: 18,
                    border: `1px solid ${colors.border}`, minHeight: 110,
                    opacity: t, transform: `translateY(${interpolate(t, [0, 1], [14, 0])}px)`,
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})` }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>Customer #{i + 100}</div>
                      <div style={{ color: "#F59E0B", fontSize: 12, marginLeft: "auto" }}>★★★★★</div>
                    </div>
                    <div style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.4 }}>"NotiProof has been a huge time-saver for our team."</div>
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};

export const AGY_SCENE5_DURATION = 360;
