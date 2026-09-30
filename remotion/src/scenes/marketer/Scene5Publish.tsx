import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

const CHANNELS = [
  { name: "Buffer", color: "#168EEA", letter: "B" },
  { name: "LinkedIn", color: "#0A66C2", letter: "in" },
  { name: "X (Twitter)", color: "#000000", letter: "𝕏" },
  { name: "Mailchimp", color: "#FFE01B", letter: "M", dark: true },
  { name: "Klaviyo", color: "#1E1E1E", letter: "K" },
  { name: "ConvertKit", color: "#FB6970", letter: "C" },
];

export const MktScene5Publish: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const modalT = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 180 } });
  const selectedIdx = 1; // LinkedIn
  const selectT = spring({ frame: frame - 90, fps, config: { damping: 16, stiffness: 200 } });
  const toastT = spring({ frame: frame - 140, fps, config: { damping: 14, stiffness: 200 } });

  return (
    <BrowserScene
      url="app.notiproof.com/content/edit/p_482"
      tag="Content Editor"
      heading="Publish content piece"
      subtitle="Post now or schedule — direct to your channels."
    >
      <div style={{ position: "relative" }}>
        {/* Modal */}
        <div style={{
          background: colors.card, borderRadius: 16, padding: 28,
          border: `1px solid ${colors.border}`, maxWidth: 720,
          boxShadow: "0 24px 60px -10px rgba(15,52,96,0.25)",
          opacity: modalT, transform: `scale(${interpolate(modalT, [0, 1], [0.94, 1])})`,
        }}>
          <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 700, color: colors.ink, marginBottom: 6 }}>
            Where should we publish?
          </div>
          <div style={{ fontSize: 14, color: colors.inkSoft, marginBottom: 20 }}>Pick a channel — NotiProof handles the rest.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 22 }}>
            {CHANNELS.map((c, i) => {
              const isSel = i === selectedIdx;
              const scale = isSel ? 1 + selectT * 0.04 : 1;
              return (
                <div key={c.name} style={{
                  background: isSel ? `${colors.sky}10` : colors.card,
                  borderRadius: 10, padding: 14,
                  border: `2px solid ${isSel ? colors.sky : colors.border}`,
                  display: "flex", alignItems: "center", gap: 12,
                  transform: `scale(${scale})`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: c.color,
                    color: c.dark ? "#000" : "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontFamily: fonts.display, fontSize: 14,
                  }}>{c.letter}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>{c.name}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: `1px solid ${colors.border}` }}>
            <div style={{ width: 42, height: 24, borderRadius: 12, background: colors.border, position: "relative" }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: "white", position: "absolute", top: 2, left: 2 }} />
            </div>
            <div style={{ fontSize: 14, color: colors.inkSoft }}>Schedule for later</div>
            <div style={{ flex: 1 }} />
            <button style={{
              padding: "10px 22px", borderRadius: 8,
              background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
              color: "white", border: "none", fontSize: 14, fontWeight: 600, fontFamily: fonts.body,
            }}>Publish now</button>
          </div>
        </div>

        {/* Success toast */}
        {toastT > 0 && (
          <div style={{
            position: "absolute", top: 0, right: 0,
            background: colors.success, color: "white", padding: "14px 22px",
            borderRadius: 12, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 12px 30px -8px rgba(16,185,129,0.4)",
            opacity: toastT, transform: `translateX(${interpolate(toastT, [0, 1], [40, 0])}px)`,
          }}>
            <span style={{ fontSize: 18 }}>✓</span> Posted to LinkedIn
          </div>
        )}
      </div>
    </BrowserScene>
  );
};

export const MKT_SCENE5_DURATION = 270;
