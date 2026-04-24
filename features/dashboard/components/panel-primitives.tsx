export const PANEL_SHADOW = [
  "0 1px 2px rgba(17,24,39,0.06)",
  "0 4px 10px rgba(17,24,39,0.05)",
  "3px 10px 24px rgba(17,24,39,0.07)",
  "8px 20px 56px rgba(17,24,39,0.13)",
].join(",");

export const OUTER_RADIUS = 28;
export const GAP = 22;
export const INNER_RADIUS = OUTER_RADIUS - GAP;
export const SCREW_SIZE = 18;

const midArcRadius = OUTER_RADIUS - GAP / 2;
const corner45Inset = OUTER_RADIUS - midArcRadius / Math.SQRT2;
export const SCREW_INSET = corner45Inset - SCREW_SIZE / 2;

const slotStyle = (rotate: number): React.CSSProperties => ({
  position: "absolute",
  width: "48%",
  height: "1.5px",
  borderRadius: "1px",
  top: "50%",
  left: "50%",
  transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
  background:
    "linear-gradient(90deg, transparent 0%, rgba(60,55,48,0.3) 20%, rgba(60,55,48,0.5) 50%, rgba(60,55,48,0.3) 80%, transparent 100%)",
});

export function Screw({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`z-10 ${className ?? ""}`} style={style}>
      <div
        className="w-full h-full rounded-full relative"
        style={{
          background:
            "radial-gradient(circle at 36% 30%, #e0dbd4 0%, #c4beb6 35%, #a8a29a 65%, #938d86 100%)",
          boxShadow: [
            "0 1.5px 5px rgba(17,24,39,0.16)",
            "0 0 0 0.5px rgba(0,0,0,0.1)",
            "inset 0 2px 1.5px rgba(255,255,255,0.3)",
            "inset 0 -1.5px 1.5px rgba(0,0,0,0.08)",
          ].join(","),
        }}
      >
        <div className="absolute inset-0">
          <div style={slotStyle(0)} />
          <div style={slotStyle(60)} />
          <div style={slotStyle(120)} />
        </div>

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(50,45,40,0.45) 0%, rgba(50,45,40,0.15) 100%)",
          }}
        />
      </div>
    </div>
  );
}
