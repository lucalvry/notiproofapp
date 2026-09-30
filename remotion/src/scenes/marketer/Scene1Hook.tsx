import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../../theme";
import { HookScene } from "../../components/BrowserScene";

const CHANNELS = [
  { name: "Twitter", color: "#1DA1F2" },
  { name: "LinkedIn", color: "#0A66C2" },
  { name: "Email", color: "#EA4335" },
  { name: "Ad Headline", color: "#7C3AED" },
  { name: "Ad Body", color: "#0EA5E9" },
  { name: "Website Quote", color: "#10B981" },
  { name: "Short Caption", color: "#F59E0B" },
  { name: "Meta Description", color: "#EC4899" },
];

export const MktScene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <HookScene
      eyebrow="NotiProof · For Marketers"
      title={<>One testimonial. <span style={{ color: colors.sky }}>Eight pieces of content.</span></>}
      subtitle="From approval to publishing across every channel — written in your brand voice."
      accentNode={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 1100 }}>
          {CHANNELS.map((c, i) => {
            const t = interpolate(frame, [30 + i * 4, 50 + i * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={c.name} style={{
                padding: "10px 18px", borderRadius: 999, background: "rgba(255,255,255,0.08)",
                border: `1px solid ${c.color}66`, color: "white",
                fontFamily: fonts.body, fontSize: 16, opacity: t,
                transform: `translateY(${interpolate(t, [0, 1], [20, 0])}px)`,
              }}>
                <span style={{ width: 8, height: 8, background: c.color, borderRadius: 4, display: "inline-block", marginRight: 8 }} />
                {c.name}
              </div>
            );
          })}
        </div>
      }
    />
  );
};

export const MKT_SCENE1_DURATION = 240;
