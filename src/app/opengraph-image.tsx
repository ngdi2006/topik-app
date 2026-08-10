import { ImageResponse } from "next/og";

export const alt =
  "Học tiếng Hàn EPS-TOPIK và luyện Phỏng vấn Vòng 2 cùng Korea Link";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #f8fbff, #eef4ff 48%, #f4edff)",
          color: "#071126",
          fontFamily: "Arial, sans-serif",
          padding: "64px 76px",
        }}
      >
        <div style={{ position: "absolute", width: 430, height: 430, right: -90, top: -110, borderRadius: 999, background: "linear-gradient(135deg, #2563eb, #7c3aed)", opacity: 0.16 }} />
        <div style={{ position: "absolute", width: 260, height: 260, right: 150, bottom: -135, borderRadius: 999, background: "#14b8a6", opacity: 0.12 }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 30, background: "linear-gradient(135deg, #2563eb, #7c3aed)", boxShadow: "0 12px 30px rgba(37, 99, 235, 0.22)" }}>K</div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800 }}>Korea Link</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", color: "#2563eb", fontSize: 22, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Lộ trình tiếng Hàn toàn diện</div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 62, lineHeight: 1.08, fontWeight: 900, letterSpacing: -2.5 }}>
              <div style={{ display: "flex" }}>Học tiếng Hàn EPS-TOPIK</div>
              <div style={{ display: "flex", color: "#6d28d9", marginTop: 8 }}>Tự tin bứt phá Vòng 2</div>
            </div>
            <div style={{ display: "flex", color: "#526078", fontSize: 26, lineHeight: 1.4, maxWidth: 900 }}>
              Thi thử, luyện phản xạ và thực hành phỏng vấn theo đúng ngành nghề.
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {["Thi thử EPS-TOPIK", "Phỏng vấn Vòng 2", "Lưu tiến độ học"].map((label) => (
              <div key={label} style={{ display: "flex", padding: "12px 20px", borderRadius: 999, background: "rgba(255,255,255,0.82)", border: "1px solid rgba(148,163,184,0.35)", color: "#334155", fontSize: 19, fontWeight: 700 }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
