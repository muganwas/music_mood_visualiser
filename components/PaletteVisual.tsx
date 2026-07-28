"use client";

interface Props {
  palette: string[];
}

/**
 * Shattered-glass mosaic — irregular stitched shards filling a square.
 */
export default function PaletteVisual({ palette }: Props) {
  const shade = (hex: string, factor: number): string => {
    const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + factor));
    const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + factor));
    const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + factor));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };

  // Blend two hex colours
  const blend = (a: string, b: string, t: number): string => {
    const ra = parseInt(a.slice(1, 3), 16);
    const ga = parseInt(a.slice(3, 5), 16);
    const ba = parseInt(a.slice(5, 7), 16);
    const rb = parseInt(b.slice(1, 3), 16);
    const gb = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const rr = Math.round(ra + (rb - ra) * t);
    const gg = Math.round(ga + (gb - ga) * t);
    const bb2 = Math.round(ba + (bb - ba) * t);
    return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb2.toString(16).padStart(2, "0")}`;
  };

  // Generate shards as irregular polygon point strings
  const shards: { points: string; color: string; darker: string }[] = [];

  // Pre-compute colour variants from the palette
  const variants: string[] = [];
  for (const hex of palette) {
    variants.push(shade(hex, 50));  // lighter
    variants.push(hex);              // base
    variants.push(shade(hex, -25)); // darker
    variants.push(shade(hex, -50)); // darkest
  }
  // Add blends between adjacent palette colours for transition shards
  for (let i = 0; i < palette.length; i++) {
    const next = palette[(i + 1) % palette.length];
    variants.push(blend(palette[i], next, 0.33));
    variants.push(blend(palette[i], next, 0.66));
  }

  // ── Hand-crafted shard polygons that tessellate a 200×200 square ──
  // Each shard is a space-separated list of "x,y" points

  const shardDefs = [
    "0,0 55,0 70,15 40,40 0,55",
    "55,0 110,0 100,30 85,25 70,15",
    "110,0 160,0 175,20 140,40 120,20 100,30",
    "160,0 200,0 200,40 175,20",
    "0,55 40,40 70,15 85,25 75,55 45,70 15,90 0,80",
    "75,55 85,25 100,30 120,20 140,40 125,65 105,70",
    "125,65 140,40 175,20 200,40 200,80 180,85 145,80",
    "15,90 45,70 75,55 60,95 35,120 0,120",
    "75,55 105,70 125,65 100,100 80,110 60,95",
    "125,65 145,80 180,85 160,115 140,120 115,105 100,100",
    "180,85 200,80 200,135 160,115",
    "0,120 35,120 60,95 80,110 65,145 30,155 0,155",
    "80,110 100,100 115,105 140,120 125,150 90,145 65,145",
    "140,120 160,115 200,135 200,170 165,165 130,155 125,150",
    "0,155 30,155 65,145 90,145 70,180 40,185 0,190",
    "90,145 125,150 130,155 165,165 155,195 115,190 70,180",
    "165,165 200,170 200,200 155,195",
    "0,190 40,185 70,180 65,200 0,200",
    "70,180 115,190 155,195 140,200 65,200",
  ];

  shardDefs.forEach((points, i) => {
    const c = variants[i % variants.length];
    shards.push({
      points,
      color: c,
      darker: shade(c, -20),
    });
  });

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
      <div className="inline-block rounded-2xl shadow-soft-md">
      <svg
        viewBox="0 0 200 200"
        className="mx-auto h-56 w-56"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: "float 3s ease-in-out infinite",
        }}
      >
        <defs>
          <clipPath id="roundedClip">
            <rect x="0" y="0" width="200" height="200" rx="16" />
          </clipPath>

          {shards.map((_, i) => (
            <linearGradient key={`g${i}`} id={`g-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={shards[i].color} />
              <stop offset="100%" stopColor={shards[i].darker} />
            </linearGradient>
          ))}

          <filter id="glassGlow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g clipPath="url(#roundedClip)" filter="url(#glassGlow)">
          {shards.map((s, i) => (
            <polygon
              key={i}
              points={s.points}
              fill={`url(#g-${i})`}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
          ))}
        </g>

        <rect
          x="0" y="0" width="200" height="200" rx="16"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      </svg>
      </div>
    </>
  );
}
