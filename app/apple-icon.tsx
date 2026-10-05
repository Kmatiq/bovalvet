import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#2B574A",
          borderRadius: "40px",
          color: "#FFFFFF",
          fontSize: "78px",
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-2px",
        }}
      >
        BV
      </div>
    ),
    { ...size }
  );
}