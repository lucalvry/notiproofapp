import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

export const CusScene4About: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const expandT = spring({ frame: frame - 20, fps, config: { damping: 22, stiffness: 120 } });
  const photoT = spring({ frame: frame - 120, fps, config: { damping: 14, stiffness: 180 } });
  const photoGlow = interpolate(Math.sin(frame / 8), [-1, 1], [0.3, 0.7]);

  return (
    <BrowserScene
      url="notiproof.com/collect/cust-01-aB42xR"
      tag="Step 2 · Optional details"
      heading="About you (optional)"
      subtitle="A photo, role, and company make your testimonial stand out."
    >
      <div style={{ maxWidth: 820, opacity: expandT, transform: `translateY(${interpolate(expandT, [0, 1], [-10, 0])}px)` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Role / position", value: "Designer" },
            { label: "Company", value: "Fernwood Bakery" },
          ].map((f, i) => {
            const t = spring({ frame: frame - (30 + i * 20), fps, config: { damping: 22, stiffness: 140 } });
            const chars = Math.floor(f.value.length * t);
            return (
              <div key={f.label}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkSoft, marginBottom: 8 }}>{f.label}</div>
                <div style={{
                  background: colors.card, borderRadius: 10, padding: "14px 16px",
                  border: `1.5px solid ${colors.border}`, fontSize: 16, color: colors.ink, minHeight: 24,
                }}>{f.value.slice(0, chars)}<span style={{ opacity: 0.5 }}>{chars < f.value.length && t > 0.1 ? "▍" : ""}</span></div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkSoft, marginBottom: 8 }}>Website (optional)</div>
            <div style={{
              background: colors.card, borderRadius: 10, padding: "14px 16px",
              border: `1.5px solid ${colors.border}`, fontSize: 16, color: colors.muted, minHeight: 24,
            }}>fernwoodbakery.com</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkSoft, marginBottom: 8 }}>
              Your photo <span style={{ color: "#EF4444" }}>(required for written)</span>
            </div>
            <div style={{
              background: colors.card, borderRadius: 10, padding: 18,
              border: `2px dashed ${photoT > 0 ? colors.sky : colors.sky}`,
              boxShadow: `0 0 0 ${4 + photoGlow * 4}px ${colors.sky}22`,
              minHeight: 80, display: "flex", alignItems: "center", gap: 14,
            }}>
              {photoT > 0 ? (
                <>
                  <div style={{
                    width: 56, height: 56, borderRadius: 28,
                    background: "linear-gradient(135deg, #FCA5A5, #F472B6)",
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: fonts.display, fontSize: 22, fontWeight: 700,
                    transform: `scale(${photoT})`,
                  }}>S</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>sarah-headshot.jpg</div>
                    <div style={{ fontSize: 12, color: colors.success }}>✓ Uploaded</div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: colors.muted, textAlign: "center", flex: 1 }}>Drop a photo here, or click to upload</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </BrowserScene>
  );
};

export const CUS_SCENE4_DURATION = 270;
