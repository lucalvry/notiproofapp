import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";
import { LogoLockup } from "../../components/LogoLockup";
import { Caption } from "../../components/Caption";
import { FakeCursor } from "../../components/FakeCursor";

export const Scene2bVerifyEmail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [60, 0]);

  // Inbox appears
  const inboxT = spring({ frame: frame - 20, fps, config: { damping: 22, stiffness: 140 } });
  // Click verify link
  const clickFrame = 75;
  const clickPulse = interpolate(frame, [clickFrame, clickFrame + 6, clickFrame + 14], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Verified badge
  const verifiedT = spring({ frame: frame - 95, fps, config: { damping: 14, stiffness: 180 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, #E0F2FE 100%)`,
        padding: 80,
        fontFamily: fonts.body,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          opacity: enterT,
          transform: `translateY(${y}px)`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 36,
          position: "relative",
        }}
      >
        {/* Left — NotiProof verify page */}
        <BrowserChrome url="app.notiproof.com/auth/verify-email">
          <div style={{ padding: "72px 56px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <LogoLockup size={32} color={colors.ink} />
            <div
              style={{
                marginTop: 44,
                width: 88,
                height: 88,
                borderRadius: 44,
                background: colors.successSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
              }}
            >
              ✉️
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 36,
                fontWeight: 700,
                color: colors.ink,
                marginTop: 28,
              }}
            >
              Check your inbox
            </div>
            <div style={{ fontSize: 16, color: colors.inkSoft, marginTop: 12, maxWidth: 360, lineHeight: 1.5 }}>
              We sent a verification link to <b style={{ color: colors.ink }}>alex@acmecoffee.com</b>. Click it to activate your account.
            </div>
            {verifiedT > 0 && (
              <div
                style={{
                  marginTop: 28,
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: colors.successSoft,
                  color: colors.success,
                  fontWeight: 700,
                  fontSize: 14,
                  transform: `scale(${verifiedT})`,
                }}
              >
                ✓ Email verified
              </div>
            )}
          </div>
        </BrowserChrome>

        {/* Right — Inbox */}
        <div
          style={{
            opacity: inboxT,
            transform: `translateY(${interpolate(inboxT, [0, 1], [40, 0])}px)`,
          }}
        >
          <BrowserChrome url="mail.google.com" favicon={null}>
            <div style={{ padding: 28, background: "#FAFBFC", height: "100%" }}>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 22,
                  fontWeight: 700,
                  color: colors.ink,
                  marginBottom: 18,
                }}
              >
                Inbox
              </div>

              <div
                style={{
                  background: "white",
                  borderRadius: 14,
                  border: `2px solid ${clickPulse > 0 ? colors.sky : colors.border}`,
                  padding: 22,
                  boxShadow: clickPulse > 0 ? `0 0 0 6px ${colors.sky}33` : "0 1px 2px rgba(0,0,0,0.04)",
                  transform: `scale(${1 + clickPulse * 0.015})`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      background: colors.navy,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    N
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>NotiProof</div>
                  <div style={{ fontSize: 12, color: colors.muted, marginLeft: "auto" }}>just now</div>
                </div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 18,
                    fontWeight: 700,
                    color: colors.ink,
                    marginBottom: 6,
                  }}
                >
                  Verify your email to start
                </div>
                <div style={{ fontSize: 14, color: colors.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
                  Hi Alex — confirm your email to activate your NotiProof account.
                </div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "12px 22px",
                    borderRadius: 10,
                    background: colors.navy,
                    color: "white",
                    fontWeight: 600,
                    fontSize: 14,
                    boxShadow: clickPulse > 0 ? `0 0 0 4px ${colors.sky}66` : "none",
                  }}
                >
                  Verify email →
                </div>
              </div>
            </div>
          </BrowserChrome>
        </div>

        <FakeCursor fromX={90} fromY={20} toX={78} toY={62} travelStart={35} clickFrame={clickFrame} />
      </div>

      <Caption tag="Step 1" text="Click the verification link in your inbox — your account goes live." />
    </AbsoluteFill>
  );
};

export const SCENE2B_VERIFY_DURATION = 152;
