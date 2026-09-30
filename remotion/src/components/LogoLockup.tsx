import React from "react";
import { Img, staticFile } from "remotion";
import { fonts } from "../theme";

export const LogoLockup: React.FC<{
  size?: number;
  color?: string;
  showWordmark?: boolean;
  gap?: number;
}> = ({ size = 36, color = "white", showWordmark = true, gap = 12 }) => {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap }}>
      <Img
        src={staticFile("logo.png")}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      {showWordmark && (
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: size * 0.78,
            color,
            letterSpacing: -0.5,
            lineHeight: 1,
          }}
        >
          NotiProof
        </span>
      )}
    </div>
  );
};
