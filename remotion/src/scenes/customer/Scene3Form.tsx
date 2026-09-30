import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

export const CusScene3Form: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // toggle between Write (default) and Video (briefly around frame 110-170)
  const showVideo = frame > 120 && frame < 180;
  const stars = interpolate(frame, [40, 90], [0, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const filledStars = Math.floor(stars);

  const text = "Their pour-overs are the best in the city. I drive 20 minutes out of my way every weekend.";
  const typeT = interpolate(frame, [95, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const visibleChars = Math.floor(text.length * typeT);

  return (
    <BrowserScene
      url="notiproof.com/collect/cust-01-aB42xR"
      tag="Step 2 · Your testimonial"
      heading="Type or record"
      subtitle="Either works. Whatever's easier."
    >
      <div style={{ maxWidth: 820 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {[
            { label: "✍️  Write", active: !showVideo },
            { label: "🎥  Record video", active: showVideo },
          ].map((t) => (
            <div key={t.label} style={{
              flex: 1, padding: "16px", textAlign: "center", borderRadius: 12,
              background: t.active ? `linear-gradient(135deg, ${colors.sky}11, ${colors.navy}11)` : colors.card,
              border: `2px solid ${t.active ? colors.sky : colors.border}`,
              fontSize: 15, fontWeight: 600,
              color: t.active ? colors.navy : colors.inkSoft,
            }}>{t.label}</div>
          ))}
        </div>

        {showVideo ? (
          <div style={{
            background: colors.navyDeep, borderRadius: 14, padding: 40,
            display: "flex", flexDirection: "column", alignItems: "center", color: "white",
            minHeight: 280,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40, background: "#EF4444",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
              boxShadow: "0 0 0 8px rgba(239,68,68,0.2)",
            }}>●</div>
            <div style={{ fontSize: 16, marginTop: 18, fontFamily: fonts.body }}>Tap to start recording</div>
            <div style={{ fontSize: 13, color: colors.skySoft, marginTop: 4 }}>0:30 max</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkSoft, marginBottom: 8 }}>Rating</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  fontSize: 36, color: i < filledStars ? "#F59E0B" : colors.border,
                  transform: `scale(${i < filledStars ? 1.05 : 1})`,
                }}>★</div>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkSoft, marginBottom: 8 }}>Your testimonial</div>
            <div style={{
              background: colors.card, borderRadius: 10, padding: 16,
              border: `1.5px solid ${colors.sky}`,
              minHeight: 120, fontSize: 16, color: colors.ink, lineHeight: 1.5,
            }}>
              {text.slice(0, visibleChars)}
              {visibleChars < text.length && <span style={{ opacity: 0.6 }}>▍</span>}
            </div>
          </div>
        )}
      </div>
    </BrowserScene>
  );
};

export const CUS_SCENE3_DURATION = 300;
