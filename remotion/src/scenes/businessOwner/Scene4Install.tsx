import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";
import { Caption } from "../../components/Caption";

const SNIPPET_LINE_1 = `<script src="https://cdn.notiproof.com/widget.js"`;
const SNIPPET_LINE_2 = `        data-website="ws_8a1f...c23"></script>`;

export const Scene4Install: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [60, 0]);

  // ---- Timing ----
  // 0-50    : Beat A — show snippet, Copy click
  // 50-130  : Beat B — editor slides in, paste before </body>, Save
  // 130-210 : Beat D — back to NotiProof verifier → Check now → Verified
  const copyClick = 40;
  const copyPulse = interpolate(frame, [copyClick, copyClick + 6, copyClick + 16], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Editor slide-in
  const editorT = spring({ frame: frame - 55, fps, config: { damping: 22, stiffness: 140 } });
  // Paste happens around frame 90
  const pasteFrame = 90;
  const pasteT = interpolate(frame, [pasteFrame, pasteFrame + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Save click around frame 115
  const saveClick = 115;
  const savePulse = interpolate(frame, [saveClick, saveClick + 6, saveClick + 16], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Verified beat
  const verifierT = spring({ frame: frame - 135, fps, config: { damping: 22, stiffness: 140 } });
  const checkClick = 165;
  const checkPulse = interpolate(frame, [checkClick, checkClick + 6, checkClick + 16], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const verifiedT = spring({ frame: frame - 178, fps, config: { damping: 14, stiffness: 180 } });

  // Phase shifts which panel is the "front" and dim the other
  const editorActive = frame >= 55 && frame < 135;
  const verifierActive = frame >= 135;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, #E0F2FE 100%)`,
        padding: 60,
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
          gap: 28,
          position: "relative",
        }}
      >
        {/* LEFT — NotiProof install page */}
        <div
          style={{
            opacity: editorActive ? 0.55 : 1,
            transform: `scale(${editorActive ? 0.98 : 1})`,
            transition: "opacity 0.2s",
          }}
        >
          <BrowserChrome url="app.notiproof.com/onboarding/install">
            <div style={{ padding: "40px 36px" }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: colors.muted,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                ONB-02 · Step 2 of 3
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 30,
                  fontWeight: 700,
                  color: colors.ink,
                  marginBottom: 16,
                }}
              >
                Install the script
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {["HTML", "Shopify"].map((t, i) => (
                  <div
                    key={t}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      background: i === 0 ? colors.navy : "transparent",
                      color: i === 0 ? "white" : colors.inkSoft,
                      border: i === 0 ? "none" : `1px solid ${colors.border}`,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>

              {/* Snippet */}
              <div
                style={{
                  background: "#0F172A",
                  color: "#E2E8F0",
                  borderRadius: 12,
                  padding: 18,
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  position: "relative",
                  boxShadow: copyPulse > 0 ? `0 0 0 4px ${colors.sky}55` : "none",
                }}
              >
                <div style={{ color: "#64748B" }}>&lt;!-- Paste before &lt;/body&gt; --&gt;</div>
                <div>
                  <span style={{ color: "#7DD3FC" }}>&lt;script</span>{" "}
                  <span style={{ color: "#FCD34D" }}>src</span>=
                  <span style={{ color: "#86EFAC" }}>"https://cdn.notiproof.com/widget.js"</span>
                </div>
                <div style={{ paddingLeft: 22 }}>
                  <span style={{ color: "#FCD34D" }}>data-website</span>=
                  <span style={{ color: "#86EFAC" }}>"ws_8a1f...c23"</span>
                  <span style={{ color: "#7DD3FC" }}>&gt;&lt;/script&gt;</span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    padding: "5px 12px",
                    borderRadius: 6,
                    background: copyPulse > 0 ? colors.success : "#1E293B",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: fonts.body,
                    transform: `scale(${1 + copyPulse * 0.08})`,
                  }}
                >
                  {copyPulse > 0.5 ? "Copied!" : "Copy"}
                </div>
              </div>

              {/* Verifier */}
              <div
                style={{
                  marginTop: 22,
                  padding: 18,
                  borderRadius: 12,
                  border: `1.5px dashed ${verifierActive ? colors.sky : colors.border}`,
                  background: verifierActive ? "#F0F9FF" : "transparent",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.inkSoft, marginBottom: 10 }}>
                  Verify your install
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: colors.card,
                      padding: "0 12px",
                      display: "flex",
                      alignItems: "center",
                      fontSize: 13,
                      color: colors.ink,
                    }}
                  >
                    https://acmecoffee.com
                  </div>
                  <div
                    style={{
                      height: 38,
                      padding: "0 18px",
                      borderRadius: 8,
                      background: colors.navy,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      fontWeight: 600,
                      fontSize: 13,
                      transform: `scale(${1 + checkPulse * 0.05})`,
                      boxShadow: checkPulse > 0 ? `0 0 0 4px ${colors.sky}66` : "none",
                    }}
                  >
                    Check now
                  </div>
                  {verifiedT > 0 && (
                    <div
                      style={{
                        padding: "7px 12px",
                        borderRadius: 999,
                        background: colors.successSoft,
                        color: colors.success,
                        fontWeight: 700,
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transform: `scale(${verifiedT})`,
                      }}
                    >
                      ✓ Verified
                    </div>
                  )}
                </div>
              </div>
            </div>
          </BrowserChrome>
        </div>

        {/* RIGHT — Site code editor */}
        <div
          style={{
            opacity: editorT,
            transform: `translateY(${interpolate(editorT, [0, 1], [40, 0])}px) scale(${verifierActive ? 0.97 : 1})`,
            filter: verifierActive ? "saturate(0.7)" : "none",
          }}
        >
          <BrowserChrome url="editor.acmecoffee.com · index.html" favicon={null}>
            <div
              style={{
                background: "#0B1120",
                color: "#CBD5E1",
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                lineHeight: 1.7,
                height: "100%",
                padding: "20px 24px",
                position: "relative",
              }}
            >
              {/* File tab */}
              <div
                style={{
                  display: "inline-block",
                  background: "#1E293B",
                  padding: "6px 14px",
                  borderRadius: "8px 8px 0 0",
                  fontFamily: fonts.body,
                  fontSize: 12,
                  color: "#94A3B8",
                  marginBottom: 14,
                }}
              >
                index.html
              </div>

              <Line n={42}>
                <span style={{ color: "#64748B" }}>&lt;/main&gt;</span>
              </Line>
              <Line n={43}>{" "}</Line>
              <Line n={44}>
                <span style={{ color: "#94A3B8", paddingLeft: 14 }}>&lt;!-- footer --&gt;</span>
              </Line>
              <Line n={45}>
                <span style={{ color: "#94A3B8", paddingLeft: 14 }}>&lt;footer&gt;© Acme Coffee&lt;/footer&gt;</span>
              </Line>
              <Line n={46}>{" "}</Line>

              {/* Paste target */}
              <div
                style={{
                  position: "relative",
                  padding: "4px 0",
                  background: pasteT > 0 ? `rgba(14,165,233,${0.15 * (1 - pasteT)})` : "transparent",
                }}
              >
                {pasteT < 1 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 60,
                      top: 4,
                      width: 2,
                      height: 20,
                      background: colors.sky,
                      opacity: pasteT < 1 ? 0.5 + 0.5 * Math.sin(frame / 2) : 0,
                      boxShadow: `0 0 8px ${colors.sky}`,
                    }}
                  />
                )}
                <Line n={47}>
                  <span
                    style={{
                      paddingLeft: 14,
                      display: "inline-block",
                      opacity: pasteT,
                      transform: `translateY(${interpolate(pasteT, [0, 1], [-6, 0])}px)`,
                    }}
                  >
                    <span style={{ color: "#7DD3FC" }}>&lt;script</span>{" "}
                    <span style={{ color: "#FCD34D" }}>src</span>=
                    <span style={{ color: "#86EFAC" }}>"https://cdn.notiproof.com/widget.js"</span>
                  </span>
                </Line>
                <Line n={48}>
                  <span
                    style={{
                      paddingLeft: 14 + 36,
                      display: "inline-block",
                      opacity: pasteT,
                      transform: `translateY(${interpolate(pasteT, [0, 1], [-6, 0])}px)`,
                    }}
                  >
                    <span style={{ color: "#FCD34D" }}>data-website</span>=
                    <span style={{ color: "#86EFAC" }}>"ws_8a1f...c23"</span>
                    <span style={{ color: "#7DD3FC" }}>&gt;&lt;/script&gt;</span>
                  </span>
                </Line>
              </div>

              <Line n={49}>
                <span style={{ color: "#64748B" }}>&lt;/body&gt;</span>
              </Line>
              <Line n={50}>
                <span style={{ color: "#64748B" }}>&lt;/html&gt;</span>
              </Line>

              {/* Save indicator */}
              <div
                style={{
                  position: "absolute",
                  bottom: 18,
                  right: 22,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {savePulse > 0 && pasteT >= 1 && (
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 12,
                      color: colors.success,
                      fontWeight: 600,
                    }}
                  >
                    ✓ Saved
                  </div>
                )}
                <div
                  style={{
                    fontFamily: fonts.body,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: colors.sky,
                    color: "white",
                    fontWeight: 600,
                    fontSize: 13,
                    transform: `scale(${1 + savePulse * 0.06})`,
                    boxShadow: savePulse > 0 ? `0 0 0 4px ${colors.sky}55` : "none",
                  }}
                >
                  Save (⌘S)
                </div>
              </div>
            </div>
          </BrowserChrome>
        </div>
      </div>

      <Caption
        tag="Step 3"
        text={
          verifierActive
            ? 'Back in NotiProof, click "Check now" — Verified.'
            : editorActive
            ? "Paste it just before </body> in your site, then save."
            : "Copy the script tag — one line of code."
        }
      />
    </AbsoluteFill>
  );
};

const Line: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <div style={{ display: "flex", gap: 14 }}>
    <span style={{ color: "#475569", width: 24, textAlign: "right", userSelect: "none" }}>{n}</span>
    <span style={{ flex: 1 }}>{children}</span>
  </div>
);

export const SCENE4_INSTALL_DURATION = 338;
