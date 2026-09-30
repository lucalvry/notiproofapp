import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";
import { Caption } from "../../components/Caption";
import { FakeCursor } from "../../components/FakeCursor";

// Mirrors real plan data from src/lib/plans.ts (verified)
const PLANS = [
  {
    key: "free",
    name: "Free",
    tagline: "For testing & small projects",
    price: 0,
    bullets: ["1 website", "100 proof / mo", "10k widget views / mo"],
  },
  {
    key: "starter",
    name: "Starter",
    tagline: "For growing storefronts",
    price: 29,
    bullets: ["5 websites", "1,000 proof / mo", "Remove badge"],
  },
  {
    key: "growth",
    name: "Growth",
    tagline: "For established brands",
    price: 79,
    bullets: ["20 websites", "10,000 proof / mo", "1M widget views"],
    highlight: true,
  },
  {
    key: "agency",
    name: "Agency",
    tagline: "For high-volume teams",
    price: 199,
    bullets: ["Unlimited websites", "100k proof / mo", "10M widget views"],
  },
];

export const Scene2cPickPlan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [60, 0]);

  // Cards stagger
  const cardT = PLANS.map((_, i) =>
    spring({ frame: frame - (18 + i * 7), fps, config: { damping: 22, stiffness: 140 } }),
  );

  // Cursor lands on Free first, then ghosts toward Starter
  const freeClick = 80;
  const freePulse = interpolate(frame, [freeClick, freeClick + 6, freeClick + 14], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const starterHover = interpolate(frame, [105, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, #E0F2FE 100%)`,
        padding: 80,
        fontFamily: fonts.body,
      }}
    >
      <div style={{ width: "100%", height: "100%", opacity: enterT, transform: `translateY(${y}px)`, position: "relative" }}>
        <BrowserChrome url="app.notiproof.com/settings/billing">
          <div style={{ padding: "48px 56px" }}>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                color: colors.muted,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              BILL-01
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 40,
                fontWeight: 700,
                color: colors.ink,
                marginBottom: 6,
              }}
            >
              Choose your plan
            </div>
            <div style={{ fontSize: 16, color: colors.inkSoft, marginBottom: 28 }}>
              Start free — upgrade anytime as your traffic grows.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {PLANS.map((p, i) => {
                const selected = p.key === "free" && freePulse > 0;
                const hovered = p.key === "starter" && starterHover > 0;
                return (
                  <div
                    key={p.key}
                    style={{
                      background: colors.card,
                      borderRadius: 16,
                      padding: 22,
                      border: `2px solid ${
                        selected ? colors.sky : hovered ? colors.skySoft : p.highlight ? colors.navy : colors.border
                      }`,
                      boxShadow:
                        selected
                          ? `0 0 0 6px ${colors.sky}33`
                          : p.highlight
                          ? `0 10px 30px -12px rgba(15,52,96,0.35)`
                          : "0 1px 2px rgba(0,0,0,0.04)",
                      opacity: cardT[i],
                      transform: `translateY(${interpolate(cardT[i], [0, 1], [20, 0])}px) scale(${
                        1 + (selected ? 0.02 : 0) + (hovered ? 0.01 : 0)
                      })`,
                      position: "relative",
                    }}
                  >
                    {p.highlight && (
                      <div
                        style={{
                          position: "absolute",
                          top: -10,
                          left: 16,
                          background: colors.navy,
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 999,
                          letterSpacing: 0.5,
                        }}
                      >
                        MOST POPULAR
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 20,
                        fontWeight: 700,
                        color: colors.ink,
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: colors.muted, marginTop: 2, minHeight: 32 }}>{p.tagline}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 12 }}>
                      <div
                        style={{
                          fontFamily: fonts.display,
                          fontSize: 36,
                          fontWeight: 700,
                          color: colors.ink,
                        }}
                      >
                        ${p.price}
                      </div>
                      <div style={{ fontSize: 13, color: colors.muted }}>/mo</div>
                    </div>
                    <div style={{ height: 1, background: colors.border, margin: "16px 0" }} />
                    {p.bullets.map((b) => (
                      <div
                        key={b}
                        style={{
                          fontSize: 13,
                          color: colors.inkSoft,
                          marginBottom: 8,
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ color: colors.success, fontWeight: 700 }}>✓</span>
                        <span>{b}</span>
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: 14,
                        height: 40,
                        borderRadius: 10,
                        background: selected || p.highlight ? colors.navy : "transparent",
                        color: selected || p.highlight ? "white" : colors.ink,
                        border: `1.5px solid ${selected || p.highlight ? colors.navy : colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {p.price === 0 ? "Start free" : "Upgrade"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>

        <FakeCursor fromX={5} fromY={95} toX={20} toY={62} travelStart={50} clickFrame={freeClick} />
      </div>

      <Caption tag="Step 2" text="Start on Free — upgrade later for more websites, views, and team seats." />
    </AbsoluteFill>
  );
};

export const SCENE2C_PLAN_DURATION = 193;
