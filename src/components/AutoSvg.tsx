/** Rear three-quarter auto rickshaw, ink outline + flat fills. Logos are rendered in the hood + back panel + tee areas. */
export function AutoSvg({ hoodLogo, backLogo, teeLogo, tint = "#f5a524" }: { hoodLogo?: string | null; backLogo?: string | null; teeLogo?: string | null; tint?: string }) {
  return (
    <svg viewBox="0 0 520 420" className="w-full h-auto drop-shadow-[8px_8px_0_#0f1133]" role="img" aria-label="Auto rickshaw">
      <defs>
        <clipPath id="hoodClip"><rect x="112" y="78" width="296" height="150" rx="14" /></clipPath>
        <clipPath id="backClip"><rect x="140" y="262" width="240" height="70" rx="8" /></clipPath>
        <clipPath id="teeClip"><rect x="228" y="118" width="64" height="58" rx="6" /></clipPath>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="#0f1133" opacity=".18" /></pattern>
      </defs>
      {/* wheels */}
      <ellipse cx="150" cy="372" rx="38" ry="38" fill="#0f1133" />
      <ellipse cx="150" cy="372" rx="16" ry="16" fill="#faf3e0" />
      <ellipse cx="370" cy="372" rx="38" ry="38" fill="#0f1133" />
      <ellipse cx="370" cy="372" rx="16" ry="16" fill="#faf3e0" />
      {/* body */}
      <path d="M90 250 Q90 60 260 52 Q430 60 430 250 L430 340 Q430 352 418 352 L102 352 Q90 352 90 340 Z" fill="#0f1133" />
      <path d="M96 250 Q96 66 260 58 Q424 66 424 250 L424 336 Q424 346 414 346 L106 346 Q96 346 96 336 Z" fill={tint} />
      <path d="M96 250 Q96 66 260 58 Q424 66 424 250 L424 336 Q424 346 414 346 L106 346 Q96 346 96 336 Z" fill="url(#dots)" />
      {/* hood (canopy) */}
      <rect x="108" y="74" width="304" height="158" rx="16" fill="#0f1133" />
      <rect x="112" y="78" width="296" height="150" rx="14" fill="#faf3e0" />
      {hoodLogo ? (
        <image href={hoodLogo} x="112" y="78" width="296" height="150" preserveAspectRatio="xMidYMid meet" clipPath="url(#hoodClip)" />
      ) : (
        <g clipPath="url(#hoodClip)">
          <rect x="112" y="78" width="296" height="150" fill="#faf3e0" />
          <text x="260" y="140" textAnchor="middle" fontFamily="var(--font-titan)" fontSize="30" fill="#1b1f5c">YOUR LOGO</text>
          <text x="260" y="176" textAnchor="middle" fontFamily="var(--font-kalam)" fontSize="20" fill="#e63e8b">hood · 8–9 sq ft</text>
        </g>
      )}
      {/* rear window strip with driver tee */}
      <rect x="140" y="104" width="240" height="86" rx="8" fill="#0f1133" opacity=".0" />
      <g>
        <circle cx="260" cy="100" r="18" fill="#0f1133" />
        <rect x="228" y="118" width="64" height="58" rx="6" fill="#0f1133" />
        <rect x="231" y="121" width="58" height="52" rx="5" fill={teeLogo ? "#faf3e0" : "#0e8c8c"} />
        {teeLogo ? <image href={teeLogo} x="231" y="121" width="58" height="52" preserveAspectRatio="xMidYMid meet" clipPath="url(#teeClip)" /> : null}
        <rect x="222" y="118" width="12" height="58" rx="4" fill="#0e8c8c" />
        <rect x="286" y="118" width="12" height="58" rx="4" fill="#0e8c8c" />
      </g>
      {/* back panel */}
      <rect x="136" y="258" width="248" height="78" rx="10" fill="#0f1133" />
      <rect x="140" y="262" width="240" height="70" rx="8" fill="#faf3e0" />
      {backLogo ? (
        <image href={backLogo} x="140" y="262" width="240" height="70" preserveAspectRatio="xMidYMid meet" clipPath="url(#backClip)" />
      ) : (
        <text x="260" y="304" textAnchor="middle" fontFamily="var(--font-titan)" fontSize="20" fill="#1b1f5c">BACK PANEL</text>
      )}
      {/* lights + plate */}
      <rect x="104" y="238" width="26" height="14" rx="3" fill="#e63e8b" stroke="#0f1133" strokeWidth="3" />
      <rect x="390" y="238" width="26" height="14" rx="3" fill="#e63e8b" stroke="#0f1133" strokeWidth="3" />
      <rect x="222" y="236" width="76" height="18" rx="3" fill="#faf3e0" stroke="#0f1133" strokeWidth="3" />
      <text x="260" y="250" textAnchor="middle" fontFamily="var(--font-titan)" fontSize="11" fill="#0f1133">HORN OK PLEASE</text>
      {/* garland */}
      <path d="M112 80 Q160 110 208 80 Q256 110 304 80 Q352 110 400 80" fill="none" stroke="#f5a524" strokeWidth="6" strokeLinecap="round" />
      <path d="M112 80 Q160 110 208 80 Q256 110 304 80 Q352 110 400 80" fill="none" stroke="#e63e8b" strokeWidth="2" strokeDasharray="4 8" />
    </svg>
  );
}
