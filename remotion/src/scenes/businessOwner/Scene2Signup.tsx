import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";
import { FakeCursor } from "../../components/FakeCursor";
import { Caption } from "../../components/Caption";

export const Scene2Signup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [60, 0]);

  // Field fill animations
  const fields = ["Alex Carter", "Acme Coffee Co.", "alex@acmecoffee.com"];
  const fieldT = fields.map((_, i) =>
    spring({ frame: frame - (20 + i * 8), fps, config: { damping: 200 } })
  );

  const clickFrame = 80;
  const flash = interpolate(frame, [clickFrame, clickFrame + 6, clickFrame + 14], [0, 1, 0], {
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
        <BrowserChrome url="app.notiproof.com/signup">
          <div style={{ padding: 80, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 560 }}>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 40,
                  fontWeight: 700,
                  color: colors.ink,
                  marginBottom: 12,
                }}
              >
                Create your account
              </div>
              <div style={{ fontSize: 17, color: colors.inkSoft, marginBottom: 32 }}>
                Start collecting social proof in minutes.
              </div>

              {/* Google button */}
              <div
                style={{
                  height: 56,
                  borderRadius: 12,
                  border: `2px solid ${colors.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  fontWeight: 600,
                  fontSize: 17,
                  color: colors.ink,
                  background: colors.card,
                  marginBottom: 24,
                  boxShadow: flash > 0 ? `0 0 0 4px ${colors.sky}55` : "none",
                  transform: `scale(${1 + flash * 0.02})`,
                }}
              >
                <GoogleG /> Continue with Google
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: colors.border }} />
                <div style={{ color: colors.muted, fontSize: 13 }}>or with email</div>
                <div style={{ flex: 1, height: 1, background: colors.border }} />
              </div>

              {[
                { label: "Your name", value: fields[0], idx: 0 },
                { label: "Business name", value: fields[1], idx: 1 },
                { label: "Work email", value: fields[2], idx: 2 },
              ].map((f) => (
                <div key={f.label} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, color: colors.inkSoft, marginBottom: 6, fontWeight: 500 }}>
                    {f.label}
                  </div>
                  <div
                    style={{
                      height: 48,
                      borderRadius: 10,
                      border: `1.5px solid ${colors.border}`,
                      background: colors.card,
                      padding: "0 14px",
                      display: "flex",
                      alignItems: "center",
                      fontSize: 16,
                      color: colors.ink,
                    }}
                  >
                    {f.value.slice(0, Math.floor(f.value.length * fieldT[f.idx]))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BrowserChrome>

        <FakeCursor fromX={20} fromY={90} toX={47} toY={43} travelStart={50} clickFrame={clickFrame} />
      </div>

      <Caption tag="Step 0" text="Sign up free — email or Google takes 10 seconds." />
    </AbsoluteFill>
  );
};

const GoogleG: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path
      d="M22.5 12.27c0-.82-.07-1.61-.21-2.36H12v4.46h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.76h3.57c2.09-1.93 3.29-4.77 3.29-8.17z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84A11 11 0 0 0 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.45.34-2.11V7.05H2.16A11 11 0 0 0 1 12c0 1.78.43 3.47 1.16 4.95l3.68-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.42c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.18 14.96 1 12 1 7.7 1 3.99 3.47 2.16 7.05l3.68 2.84C6.71 7.35 9.14 5.42 12 5.42z"
      fill="#EA4335"
    />
  </svg>
);

export const SCENE2_SIGNUP_DURATION = 225;
