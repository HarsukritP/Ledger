export function DotGrid() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
      style={{
        backgroundImage:
          "radial-gradient(circle, #FAFAFA 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}
