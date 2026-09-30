import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

const SWATCHES = ["#0F3460", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#7C3AED"];

export const AgyScene2Signup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const swatchIdx = frame > 90 ? 4 : 0; // settles on pink
  const fillT = spring({ frame: frame - 25, fps, config: { damping: 22, stiffness: 140 } });
  const fillT2 = spring({ frame: frame - 55, fps, config: { damping: 22, stiffness: 140 } });

  const nameText = "Bright Lane Studio";
  const slugText = "brightlane";
  const nameChars = Math.floor(nameText.length * fillT);
  const slugChars = Math.floor(slugText.length * fillT2);

  return (
    <BrowserScene
      url="app.notiproof.com/agency/signup"
      tag="AGY-SIGN"
      heading="Set up your agency"
      subtitle="Three fields. Pick a brand colour. You're done."
    >
      <div style={{ maxWidth: 620 }}>
        {[
          { label: "Agency name", value: nameText.slice(0, nameChars) },
          { label: "URL slug", value: "notiproof.com/portal/" + slugText.slice(0, slugChars) },
        ].map((f) => (
          <div key={f.label} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkSoft, marginBottom: 8 }}>{f.label}</div>
            <div style={{
              background: colors.card, borderRadius: 10, padding: "14px 16px",
              border: `1.5px solid ${colors.border}`, fontSize: 16, color: colors.ink,
              fontFamily: fonts.body, minHeight: 24,
            }}>{f.value}<span style={{ opacity: 0.5 }}>{(f.label === "Agency name" ? nameChars < nameText.length : slugChars < slugText.length) ? "▍" : ""}</span></div>
          </div>
        ))}
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkSoft, marginBottom: 8 }}>Brand colour</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 30 }}>
          {SWATCHES.map((c, i) => {
            const sel = i === swatchIdx;
            return (
              <div key={c} style={{
                width: 44, height: 44, borderRadius: 10, background: c,
                border: sel ? `3px solid ${colors.ink}` : `3px solid transparent`,
                transform: `scale(${sel ? 1.1 : 1})`,
              }} />
            );
          })}
        </div>
        <button style={{
          padding: "14px 28px", borderRadius: 10,
          background: `linear-gradient(135deg, ${SWATCHES[swatchIdx]}, ${colors.navy})`,
          color: "white", border: "none", fontSize: 15, fontWeight: 600, fontFamily: fonts.body,
          boxShadow: `0 10px 24px -8px ${SWATCHES[swatchIdx]}66`,
        }}>Create agency →</button>
      </div>
    </BrowserScene>
  );
};

export const AGY_SCENE2_DURATION = 240;
