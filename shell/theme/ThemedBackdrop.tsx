import { useTheme } from './ThemeContext'
import type { SceneryKind } from './themes'

/**
 * The themed world behind the whole app: a colour wash, a horizon, and that world's own
 * hand-composed illustration. It sits below everything, never takes a click, and is hidden from
 * screen readers — it is decoration, and the puzzle must stay the only thing you can actually
 * reach.
 */
export function ThemedBackdrop() {
  const { current } = useTheme()
  const illustration = THEME_ILLUSTRATIONS[current.theme.id]

  return (
    <div aria-hidden data-pz-backdrop className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 transition-[background] duration-500"
        style={{
          background: `
            radial-gradient(120% 80% at 50% -10%, var(--pz-bg-glow) 0%, transparent 60%),
            linear-gradient(180deg, var(--pz-bg) 0%, var(--pz-bg-deep) 100%)
          `,
        }}
      />

      <Scenery kind={current.theme.scenery} />
      {illustration && <Illustration content={illustration} stretched={STRETCHED[current.theme.scenery]} />}

      <style>{`
        @keyframes pz-sway {
          from { transform: translate3d(-1.5%, 0, 0); }
          to   { transform: translate3d(1.5%, 0, 0); }
        }
        @keyframes pz-twinkle {
          0%, 100% { opacity: 0.22; }
          50% { opacity: 1; }
        }
        @keyframes pz-flutter {
          0%, 100% { transform: scaleX(1) skewY(0deg); }
          50% { transform: scaleX(0.82) skewY(-7deg); }
        }
        @keyframes pz-flicker {
          0% { transform: scaleY(1) scaleX(1); opacity: 0.85; }
          100% { transform: scaleY(1.25) scaleX(0.9); opacity: 1; }
        }
        @keyframes pz-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3.5px); }
        }
        @keyframes pz-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-pz-backdrop] *, [data-pz-backdrop] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

/** Horizons should stretch to the window; round things (stars, sweets, snow) must stay round. */
const STRETCHED: Record<SceneryKind, boolean> = {
  road: true,
  peaks: true,
  clouds: true,
  hills: true,
  waves: true,
  city: true,
  stars: false,
  dots: false,
  snow: false,
}

/** A world's hand-composed scene, layered on top of its (possibly shared) scenery. */
function Illustration({ content, stretched }: { content: React.ReactNode; stretched: boolean }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio={stretched ? 'none' : 'xMidYMid slice'}
      style={{ animation: 'pz-sway 24s ease-in-out infinite alternate' }}
    >
      {content}
    </svg>
  )
}

function Scenery({ kind }: { kind: SceneryKind }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio={STRETCHED[kind] ? 'none' : 'xMidYMid slice'}
      style={{ animation: 'pz-sway 24s ease-in-out infinite alternate' }}
    >
      {SCENERY[kind]}
    </svg>
  )
}

const soft = 'var(--pz-accent-soft)'
const ring = 'var(--pz-ring)'
const glow = 'var(--pz-bg-glow)'

/** One drawing per scenery kind, all painted from theme tokens so they recolour with everything else. */
const SCENERY: Record<SceneryKind, React.ReactNode> = {
  road: (
    <>
      <path d="M0 100 L38 46 L62 46 L100 100 Z" fill={soft} opacity="0.75" />
      <path d="M0 100 L38 46 L62 46 L100 100 Z" fill="none" stroke={ring} strokeWidth="0.4" />
      {[50, 62, 76, 92].map((y, index) => (
        <rect key={y} x={49.4 - index * 0.35} y={y} width={1.2 + index * 0.7} height={3 + index * 1.6} fill={glow} opacity="0.8" />
      ))}
      <ellipse cx="50" cy="46" rx="60" ry="6" fill={ring} opacity="0.35" />
    </>
  ),
  peaks: (
    <>
      <path d="M-5 100 L18 42 L40 100 Z" fill={ring} opacity="0.45" />
      <path d="M28 100 L52 26 L76 100 Z" fill={soft} opacity="0.85" />
      <path d="M64 100 L86 48 L108 100 Z" fill={ring} opacity="0.4" />
      <path d="M44 42 L52 26 L60 42 Z" fill={glow} opacity="0.9" />
    </>
  ),
  clouds: (
    <>
      {[
        { x: 18, y: 26, r: 9 },
        { x: 74, y: 18, r: 7 },
        { x: 50, y: 62, r: 11 },
        { x: 88, y: 52, r: 8 },
        { x: 8, y: 70, r: 7 },
      ].map((cloud) => (
        <g key={`${cloud.x}-${cloud.y}`} opacity="0.5">
          <ellipse cx={cloud.x} cy={cloud.y} rx={cloud.r * 1.7} ry={cloud.r} fill={soft} />
          <ellipse cx={cloud.x - cloud.r} cy={cloud.y + cloud.r * 0.3} rx={cloud.r} ry={cloud.r * 0.7} fill={soft} />
          <ellipse cx={cloud.x + cloud.r} cy={cloud.y + cloud.r * 0.3} rx={cloud.r * 0.9} ry={cloud.r * 0.6} fill={soft} />
        </g>
      ))}
    </>
  ),
  hills: (
    <>
      <ellipse cx="20" cy="104" rx="46" ry="26" fill={ring} opacity="0.45" />
      <ellipse cx="78" cy="106" rx="52" ry="30" fill={soft} opacity="0.85" />
      <ellipse cx="50" cy="116" rx="70" ry="26" fill={glow} opacity="0.55" />
    </>
  ),
  stars: (
    <>
      {Array.from({ length: 44 }, (_, index) => {
        const angle = index * 137.5
        const x = (angle % 97) + 1.5
        const y = ((angle * 1.7) % 93) + 3
        const r = 0.35 + (index % 4) * 0.28
        return <circle key={index} cx={x} cy={y} r={r} fill={glow} opacity={0.35 + (index % 5) * 0.12} />
      })}
      <circle cx="78" cy="22" r="7" fill={soft} opacity="0.5" />
      <ellipse cx="78" cy="22" rx="13" ry="2.4" fill={ring} opacity="0.55" transform="rotate(-18 78 22)" />
    </>
  ),
  waves: (
    <>
      <path d="M0 62 Q 12 55 25 62 T 50 62 T 75 62 T 100 62 V101 H0 Z" fill={soft} opacity="0.55" />
      <path d="M0 74 Q 12 67 25 74 T 50 74 T 75 74 T 100 74 V101 H0 Z" fill={ring} opacity="0.5" />
      <path d="M0 86 Q 12 79 25 86 T 50 86 T 75 86 T 100 86 V101 H0 Z" fill={glow} opacity="0.6" />
    </>
  ),
  city: (
    <>
      {[
        [4, 58, 12],
        [18, 44, 10],
        [30, 66, 14],
        [46, 36, 12],
        [60, 56, 10],
        [72, 48, 16],
        [90, 62, 12],
      ].map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={101 - y} fill={soft} opacity="0.8" />
          <rect x={x} y={y} width={w} height={101 - y} fill="none" stroke={ring} strokeWidth="0.3" />
        </g>
      ))}
      <rect x="0" y="94" width="100" height="7" fill={ring} opacity="0.5" />
    </>
  ),
  dots: (
    <>
      {Array.from({ length: 36 }, (_, index) => {
        const column = index % 6
        const row = Math.floor(index / 6)
        return (
          <circle
            key={index}
            cx={8 + column * 17 + (row % 2) * 8}
            cy={8 + row * 16}
            r={2.2 + (index % 3) * 0.9}
            fill={index % 2 === 0 ? soft : glow}
            opacity="0.55"
          />
        )
      })}
    </>
  ),
  snow: (
    <>
      <ellipse cx="28" cy="108" rx="50" ry="26" fill={glow} opacity="0.7" />
      <ellipse cx="82" cy="110" rx="46" ry="24" fill={soft} opacity="0.8" />
      {Array.from({ length: 40 }, (_, index) => {
        const angle = index * 137.5
        return (
          <circle
            key={index}
            cx={(angle % 98) + 1}
            cy={((angle * 2.3) % 88) + 2}
            r={0.5 + (index % 3) * 0.35}
            fill={glow}
            opacity="0.75"
          />
        )
      })}
    </>
  ),
}

/** A few fixed, twinkling points of light. */
function Sparkles({ points, duration = 2.8 }: { points: [x: number, y: number, delay: number][]; duration?: number }) {
  return (
    <>
      {points.map(([x, y, delay]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="0.75"
          fill={glow}
          style={{ animation: `pz-twinkle ${duration}s ease-in-out ${delay}s infinite` }}
        />
      ))}
    </>
  )
}

/**
 * A full hand-composed world for every theme, keyed by theme id. Everything is placed on purpose
 * — no seeded scatter, no emoji — and painted from the same soft/ring/glow tokens as the shared
 * scenery, so it recolours with the rest of the theme. Decoration stays off the centre, where the
 * puzzle and its title live.
 */
const THEME_ILLUSTRATIONS: Record<string, React.ReactNode> = {
  cars: (
    <>
      {/* the sun, upper right */}
      <g opacity="0.8">
        <circle cx="86" cy="14" r="7" fill={glow} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="86"
            y1="2"
            x2="86"
            y2="6"
            stroke={glow}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.55"
            transform={`rotate(${deg} 86 14)`}
          />
        ))}
      </g>

      {/* a checkered flag, fluttering trackside */}
      <g transform="translate(14 12)">
        <line x1="0" y1="0" x2="0" y2="22" stroke={ring} strokeWidth="0.8" />
        <g style={{ transformOrigin: '0px 0px', animation: 'pz-flutter 3s ease-in-out infinite' }}>
          {Array.from({ length: 8 }, (_, index) => {
            const col = index % 4
            const row = Math.floor(index / 4)
            return (
              <rect
                key={index}
                x={col * 2.2}
                y={row * 2.2}
                width="2.2"
                height="2.2"
                fill={(col + row) % 2 === 0 ? ring : glow}
                opacity="0.85"
              />
            )
          })}
        </g>
      </g>

      {/* a car, speeding past low on the road */}
      <g transform="translate(64 74)">
        <line x1="-16" y1="-2" x2="-6" y2="-2" stroke={ring} strokeWidth="1" strokeLinecap="round" opacity="0.35" />
        <line x1="-19" y1="2" x2="-8" y2="2" stroke={ring} strokeWidth="1" strokeLinecap="round" opacity="0.25" />
        <path d="M-10 0 C -10 -4 -6 -6 0 -6 L6 -6 C 10 -6 12 -3 12 0 L12 2 L-10 2 Z" fill={soft} opacity="0.9" />
        <path d="M-4 -6 C -2 -9 3 -9 5 -6 Z" fill={soft} opacity="0.9" />
        <circle cx="-5" cy="2" r="2.4" fill={ring} opacity="0.85" />
        <circle cx="8" cy="2" r="2.4" fill={ring} opacity="0.85" />
      </g>
    </>
  ),
  princess: (
    <>
      {/* a rose vine, low in the corner the puzzle never uses */}
      <path d="M2 100 C 4 88 2 80 8 72" stroke={ring} strokeWidth="0.6" fill="none" opacity="0.35" />
      <g opacity="0.4" fill={ring}>
        <ellipse cx="6" cy="82" rx="2.6" ry="1.4" transform="rotate(30 6 82)" />
        <ellipse cx="4" cy="90" rx="2.2" ry="1.2" transform="rotate(-20 4 90)" />
        <ellipse cx="9" cy="74" rx="2" ry="1.1" transform="rotate(50 9 74)" />
      </g>
      <g opacity="0.5" fill={glow}>
        <circle cx="7" cy="78" r="1.4" />
        <circle cx="4" cy="86" r="1.1" />
      </g>

      {/* two doves, gliding */}
      <path d="M18 20 Q20 17 22 20 Q24 17 26 20" stroke={ring} strokeWidth="0.6" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M78 26 Q80 23.4 82 26 Q84 23.4 86 26" stroke={ring} strokeWidth="0.55" fill="none" opacity="0.5" strokeLinecap="round" />

      <Sparkles
        points={[
          [30, 14, 0],
          [70, 10, 1.4],
          [14, 34, 0.7],
          [86, 40, 2.1],
        ]}
        duration={3}
      />

      {/* the keep, set back and taller, behind the two flanking towers */}
      <rect x="46.5" y="10" width="7" height="28" fill={soft} opacity="0.85" />
      <polygon points="46.5,10 50,0 53.5,10" fill={glow} opacity="0.95" />
      <line x1="50" y1="0" x2="50" y2="-6" stroke={ring} strokeWidth="0.5" />
      <g transform="translate(50 -6)">
        <polygon
          points="0,0 5,2 0,4"
          fill={ring}
          opacity="0.85"
          style={{ transformOrigin: '0px 0px', animation: 'pz-flutter 3.6s ease-in-out infinite' }}
        />
      </g>

      {/* left tower */}
      <rect x="37" y="20" width="7" height="22" fill={soft} opacity="0.92" />
      <polygon points="37,20 40.5,10 44,20" fill={ring} opacity="0.9" />
      <rect x="39.6" y="28" width="1.8" height="3" fill={glow} opacity="0.85" />

      {/* right tower */}
      <rect x="56" y="17" width="7" height="25" fill={soft} opacity="0.92" />
      <polygon points="56,17 59.5,7 63,17" fill={ring} opacity="0.9" />
      <rect x="58.6" y="25" width="1.8" height="3" fill={glow} opacity="0.85" />

      {/* curtain wall, crenellations, gate */}
      <rect x="42" y="34" width="16" height="8" fill={soft} opacity="0.88" />
      {[42, 45.3, 48.6, 51.9, 55.2].map((x) => (
        <rect key={x} x={x} y="32.4" width="1.6" height="1.8" fill={soft} opacity="0.88" />
      ))}
      <path d="M48 42 L48 38 A2 2 0 0 1 52 38 L52 42 Z" fill={ring} opacity="0.55" />
    </>
  ),
  unicorns: (
    <>
      {/* a full rainbow, rising from the bottom edge */}
      <g opacity="0.9">
        {([
          [34, ring],
          [29.4, glow],
          [24.8, soft],
          [20.2, ring],
          [15.6, glow],
        ] as [number, string][]).map(([radius, color], index) => (
          <path
            key={radius}
            d={`M ${50 - radius} 86 A ${radius} ${radius} 0 0 1 ${50 + radius} 86`}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            opacity={0.75 - index * 0.06}
          />
        ))}
      </g>

      <Sparkles
        points={[
          [78, 20, 0],
          [84, 30, 1.2],
          [70, 16, 2],
          [90, 42, 0.6],
        ]}
        duration={2.6}
      />

      {/* a unicorn, caught mid-leap off a cloud on the right */}
      <path
        d="M92 100 C 90 78 82 66 74 56 C 68 49 68 43 72 39 C 78 43 82 51 84 61 C 88 73 90 88 90 100 Z"
        fill={soft}
        opacity="0.55"
      />
      <g fill={soft} opacity="0.6">
        <path d="M72 39 C 69 37 65.5 37.4 64 40 C 63.2 43 65.4 46 69 46 C 72 46 74.2 42.6 72 39 Z" />
        <path d="M68.4 38 L65.6 33 L70 36.4 Z" />
      </g>
      <polygon points="69,38 70.6,23 72.6,38.6" fill={glow} opacity="0.85" />
      <g stroke={ring} strokeWidth="0.4" opacity="0.4">
        <line x1="69.6" y1="34" x2="71.6" y2="33" />
        <line x1="69.9" y1="30.4" x2="71.9" y2="29.4" />
        <line x1="70.2" y1="26.8" x2="72.2" y2="25.8" />
      </g>
      <g stroke={ring} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5">
        <path d="M72 39 C 78 41 85 39 91 44" />
        <path d="M76 48 C 83 49 89 48 95 54" />
      </g>
      <path d="M78 60 C 85 61 90 65 94 71" stroke={glow} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.45" />
    </>
  ),
  dinos: (
    <>
      {/* a volcano, distant, softly smoking */}
      <g opacity="0.5">
        <path d="M64 100 L74 66 L84 100 Z" fill={ring} />
        <path d="M70 70 Q74 64 78 70 Z" fill={glow} opacity="0.85" />
      </g>
      <g opacity="0.35" fill={soft}>
        <circle cx="76" cy="58" r="2.2" style={{ animation: 'pz-bob 6s ease-in-out infinite' }} />
        <circle cx="80" cy="50" r="3" style={{ animation: 'pz-bob 7s ease-in-out 1s infinite' }} />
        <circle cx="72" cy="46" r="2.4" style={{ animation: 'pz-bob 6.5s ease-in-out 2s infinite' }} />
      </g>

      {/* ferns, corners */}
      <g opacity="0.6" fill={soft}>
        <path d="M4 100 Q10 80 4 62 Q16 78 14 100 Z" />
        <path d="M96 100 Q90 82 96 66 Q84 82 86 100 Z" />
      </g>

      {/* a pterodactyl, gliding */}
      <path d="M20 24 Q26 16 32 22 Q26 20 24 26 Q20 22 20 24 Z" fill={ring} opacity="0.55" />

      {/* a long-neck, grazing on the hill */}
      <g opacity="0.6" fill={soft}>
        <ellipse cx="54" cy="92" rx="15" ry="10" />
        <path d="M42 86 C 40 76 36 68 30 64 C 34 63 40 65 44 72 C 46 78 46 84 46 88 Z" />
        <circle cx="29" cy="63" r="2.4" />
      </g>
      <g opacity="0.5" fill={ring}>
        <ellipse cx="54" cy="100" rx="4" ry="6" />
        <ellipse cx="62" cy="100" rx="4" ry="6" />
      </g>
    </>
  ),
  space: (
    <>
      <Sparkles
        points={[
          [14, 16, 0],
          [34, 8, 1.1],
          [58, 12, 2.3],
          [24, 34, 0.6],
          [8, 46, 1.8],
        ]}
      />

      {/* a ringed planet */}
      <g opacity="0.85">
        <circle cx="80" cy="22" r="8" fill={soft} />
        <circle cx="83" cy="19" r="8" fill={ring} opacity="0.25" />
        <ellipse cx="80" cy="22" rx="14" ry="3.2" fill="none" stroke={ring} strokeWidth="1.6" opacity="0.6" transform="rotate(-16 80 22)" />
        <circle cx="77" cy="20" r="1" fill={ring} opacity="0.35" />
        <circle cx="82" cy="25" r="0.7" fill={ring} opacity="0.3" />
      </g>

      {/* a small cratered moon */}
      <g opacity="0.6">
        <circle cx="10" cy="70" r="4.2" fill={glow} />
        <circle cx="9" cy="68.5" r="0.8" fill={ring} opacity="0.4" />
        <circle cx="11.5" cy="71" r="0.6" fill={ring} opacity="0.35" />
      </g>

      {/* a shooting star */}
      <line x1="46" y1="10" x2="60" y2="20" stroke={glow} strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />
      <circle cx="60" cy="20" r="1" fill={glow} opacity="0.7" />

      {/* the rocket, climbing */}
      <g transform="translate(16 88) rotate(-30) scale(1.7)">
        <path d="M0 0 C -2.6 -6 -2.6 -14 0 -20 C 2.6 -14 2.6 -6 0 0 Z" fill={soft} opacity="0.9" />
        <circle cx="0" cy="-13" r="1.6" fill={glow} opacity="0.9" />
        <circle cx="0" cy="-13" r="1.6" fill="none" stroke={ring} strokeWidth="0.4" opacity="0.5" />
        <path d="M-2.4 -2 L-4.6 3 L-1.2 0.5 Z" fill={ring} opacity="0.8" />
        <path d="M2.4 -2 L4.6 3 L1.2 0.5 Z" fill={ring} opacity="0.8" />
        <path
          d="M-1.4 0 L0 7 L1.4 0 Z"
          fill={glow}
          opacity="0.85"
          style={{ transformOrigin: '0px -1px', animation: 'pz-flicker 1.1s ease-in-out infinite alternate' }}
        />
      </g>
    </>
  ),
  ocean: (
    <>
      {/* sunlight, filtering down */}
      <g opacity="0.25" stroke={glow} strokeWidth="1.4">
        <line x1="30" y1="0" x2="20" y2="40" />
        <line x1="50" y1="0" x2="50" y2="42" />
        <line x1="70" y1="0" x2="78" y2="38" />
      </g>

      {/* seaweed, corners */}
      <g opacity="0.65" fill={ring}>
        <path d="M8 100 Q6 86 11 81 Q14 89 13 100 Z" />
        <path d="M17 100 Q18 84 23 79 Q26 89 22 100 Z" />
        <path d="M87 100 Q89 88 94 83 Q97 91 92 100 Z" />
      </g>

      {/* coral, along the seabed */}
      <g opacity="0.6" fill={ring}>
        <path d="M40 92 q3 -3 6 0 q-1.5 3 -3 3 q-1.5 0 -3 -3Z" />
        <path d="M48 94 q3 -3 6 0 q-1.5 3 -3 3 q-1.5 0 -3 -3Z" />
        <path d="M56 90 q3 -3 6 0 q-1.5 3 -3 3 q-1.5 0 -3 -3Z" />
      </g>

      {/* bubbles, rising */}
      <g fill={glow} opacity="0.5">
        <circle cx="72" cy="54" r="1.2" style={{ animation: 'pz-bob 5s ease-in-out infinite' }} />
        <circle cx="76" cy="44" r="1" style={{ animation: 'pz-bob 5.6s ease-in-out 1.4s infinite' }} />
        <circle cx="70" cy="36" r="0.8" style={{ animation: 'pz-bob 4.6s ease-in-out 2.4s infinite' }} />
      </g>

      {/* a dolphin, leaping */}
      <path
        d="M14 58 C 20 46 34 44 40 52 C 36 52 32 54 30 58 C 34 58 38 60 40 64 C 32 66 20 66 14 58 Z"
        fill={soft}
        opacity="0.6"
      />
      <path d="M16 58 L10 54 L14 60 Z" fill={soft} opacity="0.6" />
    </>
  ),
  pirates: (
    <>
      {/* the ship, sailing */}
      <g opacity="0.85">
        <path d="M10 78 L38 78 L33 90 L15 90 Z" fill={ring} />
        <line x1="24" y1="78" x2="24" y2="52" stroke={ring} strokeWidth="0.7" />
        <path d="M24 55 L35 64 L24 68 Z" fill={soft} opacity="0.9" />
        <path d="M24 58 L14 65 L24 69 Z" fill={soft} opacity="0.85" />
        <g transform="translate(24 52)">
          <polygon
            points="0,0 6,2.4 0,4.8"
            fill={ring}
            opacity="0.9"
            style={{ transformOrigin: '0px 0px', animation: 'pz-flutter 3.4s ease-in-out infinite' }}
          />
        </g>
      </g>

      {/* a small island, with a palm */}
      <g opacity="0.7">
        <ellipse cx="80" cy="96" rx="16" ry="5" fill={ring} opacity="0.5" />
        <path d="M80 96 L80 78" stroke={ring} strokeWidth="0.9" fill="none" />
        <path d="M80 78 Q88 80 85 90" fill={ring} opacity="0.75" />
        <path d="M80 78 Q74 79 76 88" fill={ring} opacity="0.7" />
        <path d="M80 78 Q86 74 90 78" fill={ring} opacity="0.65" />
      </g>

      {/* a treasure chest, foreground */}
      <g opacity="0.75" transform="translate(58 92)">
        <rect x="-6" y="-4" width="12" height="6" fill={soft} />
        <path d="M-6 -4 Q0 -9 6 -4 Z" fill={soft} />
        <rect x="-1" y="-4" width="2" height="2.4" fill={glow} opacity="0.9" />
      </g>

      {/* crossed swords */}
      <g opacity="0.55" stroke={ring} strokeWidth="0.8">
        <line x1="58" y1="16" x2="66" y2="24" />
        <line x1="66" y1="16" x2="58" y2="24" />
      </g>
    </>
  ),
  jungle: (
    <>
      <g opacity="0.7" stroke={ring} strokeWidth="1" fill="none">
        <path d="M6 0 Q10 14 4 24 Q10 30 6 40" />
        <path d="M94 0 Q90 12 96 20 Q90 28 94 36" />
      </g>
      <g opacity="0.65" fill={ring}>
        <circle cx="6" cy="24" r="1.4" />
        <circle cx="4" cy="34" r="1.2" />
        <circle cx="96" cy="20" r="1.4" />
        <circle cx="94" cy="30" r="1.2" />
      </g>
      <g opacity="0.6" fill={ring}>
        <rect x="9" y="76" width="2.4" height="16" />
        <circle cx="10.2" cy="72" r="6" />
        <circle cx="5" cy="76" r="4.6" />
        <circle cx="15" cy="76" r="4.6" />
      </g>
      <g opacity="0.5" fill={ring}>
        <rect x="89" y="70" width="2.6" height="20" />
        <circle cx="90.3" cy="65" r="7.5" />
        <circle cx="83" cy="70" r="5.5" />
        <circle cx="97" cy="70" r="5.5" />
      </g>

      {/* a vine, with a monkey swinging from it */}
      <path d="M50 0 Q52 14 48 24" stroke={ring} strokeWidth="0.8" fill="none" opacity="0.5" />
      <g transform="translate(48 24)">
        <g opacity="0.65" fill={soft} style={{ transformOrigin: '0px -24px', animation: 'pz-flutter 4.4s ease-in-out infinite' }}>
          <circle cx="0" cy="4" r="3.4" />
          <circle cx="-3.6" cy="2" r="1.6" />
          <circle cx="3.6" cy="2" r="1.6" />
          <path d="M-2 8 L-3.4 13" stroke={soft} strokeWidth="1" strokeLinecap="round" />
          <path d="M2 8 L3.4 13" stroke={soft} strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>

      {/* a toucan */}
      <g opacity="0.6" fill={glow} transform="translate(70 20)">
        <ellipse cx="0" cy="0" rx="3" ry="2.4" />
        <path d="M3 -0.6 L9 0.6 L3 1.6 Z" fill={ring} opacity="0.8" />
      </g>
    </>
  ),
  robots: (
    <>
      {/* two gears, turning in the background */}
      <g opacity="0.35" fill="none" stroke={ring} strokeWidth="1.2">
        <g style={{ transformOrigin: '82px 74px', animation: 'pz-spin 18s linear infinite' }}>
          <circle cx="82" cy="74" r="7" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line key={deg} x1="82" y1="65" x2="82" y2="68" transform={`rotate(${deg} 82 74)`} />
          ))}
        </g>
      </g>
      <g opacity="0.3" fill="none" stroke={ring} strokeWidth="1">
        <g style={{ transformOrigin: '92px 84px', animation: 'pz-spin 12s linear infinite reverse' }}>
          <circle cx="92" cy="84" r="4.6" />
          {[0, 90, 180, 270].map((deg) => (
            <line key={deg} x1="92" y1="78.4" x2="92" y2="80.4" transform={`rotate(${deg} 92 84)`} />
          ))}
        </g>
      </g>

      {/* a friendly robot */}
      <g opacity="0.75" fill={soft}>
        <rect x="12" y="60" width="16" height="18" rx="2" />
        <rect x="16" y="46" width="8" height="10" rx="1.6" />
        <circle cx="20" cy="34" r="6" />
        <rect x="6" y="63" width="5" height="10" rx="1.6" />
        <rect x="29" y="63" width="5" height="10" rx="1.6" />
      </g>
      <g opacity="0.85" fill={glow}>
        <circle cx="17.4" cy="34" r="1.3" />
        <circle cx="22.6" cy="34" r="1.3" />
      </g>
      <line x1="20" y1="28" x2="20" y2="24" stroke={ring} strokeWidth="0.6" opacity="0.7" />
      <circle cx="20" cy="23" r="1.1" fill={glow} opacity="0.7" style={{ animation: 'pz-twinkle 2.2s ease-in-out infinite' }} />
    </>
  ),
  candy: (
    <>
      {/* a candy cane */}
      <g transform="translate(10 46)" opacity="0.85">
        <path d="M0 40 L0 10 Q0 0 10 0 Q20 0 20 10" fill="none" stroke={ring} strokeWidth="3.4" strokeLinecap="round" />
        <path
          d="M0 40 L0 10 Q0 0 10 0 Q20 0 20 10"
          fill="none"
          stroke={glow}
          strokeWidth="3.4"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      </g>

      {/* a lollipop, turning slowly */}
      <g transform="translate(82 34)" opacity="0.8">
        <line x1="0" y1="0" x2="0" y2="16" stroke={ring} strokeWidth="1" />
        <g style={{ transformOrigin: '0px -6px', animation: 'pz-spin 10s linear infinite' }}>
          <circle cx="0" cy="-6" r="6" fill={soft} />
          <path d="M0 -6 m-6 0 a6 6 0 1 1 12 0" fill="none" stroke={ring} strokeWidth="1" opacity="0.8" />
          <path d="M0 -6 m-3.4 0 a3.4 3.4 0 1 1 6.8 0" fill="none" stroke={ring} strokeWidth="0.8" opacity="0.6" />
        </g>
      </g>

      {/* gumdrops, low row */}
      {([
        [44, 94, ring],
        [52, 96, glow],
        [60, 93, soft],
      ] as [number, number, string][]).map(([x, y, color]) => (
        <path key={x} d={`M${x - 4} ${y} Q${x - 4} ${y - 7} ${x} ${y - 7} Q${x + 4} ${y - 7} ${x + 4} ${y} Z`} fill={color} opacity="0.7" />
      ))}

      {/* a ribbon bow, floating */}
      <g opacity="0.55" fill={ring} transform="translate(30 18)">
        <path d="M0 0 L-6 -4 L-6 4 Z" />
        <path d="M0 0 L6 -4 L6 4 Z" />
        <circle cx="0" cy="0" r="1.6" fill={glow} />
      </g>
    </>
  ),
  dragons: (
    <>
      {/* the dragon, perched on the peak */}
      <g opacity="0.6" fill={soft}>
        <path d="M44 44 C 40 36 44 28 52 26 C 50 30 52 34 56 34 C 60 34 62 30 62 26 C 70 28 74 36 70 44 C 66 40 60 38 56 38 C 52 38 48 40 44 44 Z" />
      </g>
      <g opacity="0.55" fill={ring}>
        <path d="M44 42 C 34 40 26 32 24 22 C 30 26 36 28 42 30 Z" />
        <path d="M70 42 C 80 40 88 32 90 22 C 84 26 78 28 72 30 Z" />
      </g>
      <circle cx="57" cy="30" r="1" fill={glow} opacity="0.9" />

      {/* flame, flickering */}
      <path
        d="M63 32 C 68 32 72 35 74 40 C 70 38 66 38 63 40 Z"
        fill={glow}
        opacity="0.85"
        style={{ transformOrigin: '63px 36px', animation: 'pz-flicker 0.9s ease-in-out infinite alternate' }}
      />

      {/* treasure, at the base */}
      <g opacity="0.6" fill={glow}>
        <circle cx="16" cy="96" r="2.4" />
        <circle cx="22" cy="98" r="2" />
        <circle cx="10" cy="98" r="1.7" />
      </g>
      <g opacity="0.4" fill={soft}>
        <circle cx="70" cy="60" r="1" />
        <circle cx="76" cy="66" r="0.7" />
        <circle cx="66" cy="70" r="0.6" />
      </g>
    </>
  ),
  superheroes: (
    <>
      {/* a spotlight, sweeping the sky */}
      <path d="M50 0 L20 60 L80 60 Z" fill={glow} opacity="0.12" />

      {/* skyline silhouettes */}
      <g opacity="0.3">
        <polygon points="30,100 22,20 38,20" fill={glow} />
        <polygon points="70,100 62,14 78,14" fill={soft} />
      </g>

      {/* the hero, mid-leap */}
      <g opacity="0.7" fill={soft}>
        <ellipse cx="52" cy="46" rx="3.2" ry="3.6" />
        <path d="M52 49 L48 62 L56 62 Z" />
        <path d="M48 52 L40 48" stroke={soft} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M56 52 L64 46" stroke={soft} strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <path d="M49 48 C 40 52 34 62 36 74 C 42 66 48 58 52 50 Z" fill={ring} opacity="0.55" />

      {/* a burst, upper right */}
      <polygon points="82,10 84,15 89,15 85,18 87,23 82,20 77,23 79,18 75,15 80,15" fill={glow} opacity="0.7" />
    </>
  ),
  farm: (
    <>
      {/* the sun */}
      <g opacity="0.85">
        <circle cx="14" cy="14" r="6" fill={glow} />
        {[0, 45, 90, 135].map((deg) => (
          <line key={deg} x1="14" y1="4" x2="14" y2="7" stroke={glow} strokeWidth="1" strokeLinecap="round" opacity="0.5" transform={`rotate(${deg} 14 14)`} />
        ))}
      </g>

      {/* the barn */}
      <g opacity="0.8">
        <rect x="66" y="70" width="20" height="16" fill={soft} />
        <polygon points="64,70 76,58 88,70" fill={ring} />
        <rect x="74" y="78" width="4" height="8" fill={ring} opacity="0.8" />
        <rect x="69" y="74" width="3" height="3" fill={glow} opacity="0.7" />
        <rect x="80" y="74" width="3" height="3" fill={glow} opacity="0.7" />
      </g>

      {/* a windmill, turning */}
      <g opacity="0.55">
        <line x1="92" y1="94" x2="92" y2="60" stroke={ring} strokeWidth="1" />
        <g style={{ transformOrigin: '92px 60px', animation: 'pz-spin 9s linear infinite' }}>
          {[0, 90, 180, 270].map((deg) => (
            <ellipse key={deg} cx="92" cy="54" rx="2" ry="6" fill={ring} opacity="0.6" transform={`rotate(${deg} 92 60)`} />
          ))}
        </g>
      </g>

      {/* the fence */}
      <g opacity="0.5" stroke={ring} strokeWidth="0.6">
        <line x1="0" y1="94" x2="60" y2="94" />
        <line x1="6" y1="86" x2="6" y2="94" />
        <line x1="18" y1="86" x2="18" y2="94" />
        <line x1="30" y1="86" x2="30" y2="94" />
        <line x1="42" y1="86" x2="42" y2="94" />
        <line x1="54" y1="86" x2="54" y2="94" />
      </g>

      {/* a grazing hen */}
      <g opacity="0.6" fill={soft} transform="translate(30 90)">
        <ellipse cx="0" cy="0" rx="4" ry="3.2" />
        <circle cx="4.4" cy="-2.4" r="1.8" />
        <path d="M6 -2.4 L8.4 -1.8 L6 -1 Z" fill={ring} opacity="0.7" />
      </g>
    </>
  ),
  sports: (
    <>
      {/* the goal */}
      <g opacity="0.6" stroke={ring} strokeWidth="1" fill="none">
        <path d="M20 94 L20 74 L40 74 L40 94" />
        {[24, 28, 32, 36].map((x) => (
          <line key={x} x1={x} y1="74" x2={x} y2="94" strokeWidth="0.4" opacity="0.6" />
        ))}
        {[78, 82, 86, 90].map((y) => (
          <line key={y} x1="20" y1={y} x2="40" y2={y} strokeWidth="0.4" opacity="0.6" />
        ))}
      </g>

      {/* field lines */}
      <g opacity="0.4" stroke={soft} strokeWidth="0.5">
        <line x1="0" y1="80" x2="100" y2="80" />
        <line x1="0" y1="88" x2="100" y2="88" />
      </g>

      {/* a floodlight */}
      <g opacity="0.55">
        <line x1="86" y1="94" x2="86" y2="48" stroke={ring} strokeWidth="1" />
        <rect x="78" y="42" width="16" height="6" rx="1" fill={ring} />
        {[80, 84, 88, 92].map((x) => (
          <circle key={x} cx={x} cy="45" r="1" fill={glow} opacity="0.85" />
        ))}
      </g>

      {/* the ball, mid-flight */}
      <g opacity="0.65" transform="translate(58 30)">
        <circle r="4" fill={soft} />
        <path d="M0 -4 L2.4 -1.4 L1.4 2.4 L-1.4 2.4 L-2.4 -1.4 Z" fill={ring} opacity="0.6" />
      </g>
    </>
  ),
  fairies: (
    <>
      {/* toadstools */}
      <g opacity="0.75" fill={ring}>
        <path d="M10 90 Q18 76 26 90 Z" />
        <rect x="16.6" y="90" width="2.8" height="7" rx="1.4" fill={soft} />
      </g>
      <g opacity="0.7" fill={ring}>
        <path d="M76 88 Q82 78 88 88 Z" />
        <rect x="80.7" y="88" width="2.6" height="6" rx="1.3" fill={soft} />
      </g>
      <g opacity="0.55" fill={soft}>
        <circle cx="14" cy="84" r="0.8" />
        <circle cx="21" cy="85" r="0.7" />
      </g>

      {/* a crescent moon */}
      <path d="M58 14 A8 8 0 1 0 58 30 A6.4 6.4 0 1 1 58 14 Z" fill={glow} opacity="0.6" />

      {/* the fairy, mid-flight, leaving a sparkle trail */}
      <g opacity="0.7" fill={soft} transform="translate(44 46)">
        <ellipse cx="0" cy="0" rx="1.6" ry="2" />
        <circle cx="0" cy="-3" r="1.4" />
        <path d="M-1.4 -1 C -8 -5 -10 2 -3 3 Z" opacity="0.7" />
        <path d="M1.4 -1 C 8 -5 10 2 3 3 Z" opacity="0.7" />
      </g>
      <Sparkles
        points={[
          [38, 52, 0],
          [34, 58, 1],
          [30, 64, 2],
        ]}
        duration={2.4}
      />
    </>
  ),
  pets: (
    <>
      {/* a paw print trail */}
      {[
        [10, 90],
        [18, 80],
        [27, 71],
      ].map(([x, y], index) => (
        <g key={`${x}-${y}`} opacity={0.4 - index * 0.08} fill={soft} transform={`translate(${x} ${y}) scale(0.45)`}>
          <ellipse cx="0" cy="4" rx="3.2" ry="2.6" />
          <circle cx="-3" cy="-1" r="1.1" />
          <circle cx="0" cy="-2.4" r="1.1" />
          <circle cx="3" cy="-1" r="1.1" />
        </g>
      ))}

      {/* a puppy, sitting */}
      <g opacity="0.65" fill={soft} transform="translate(66 84)">
        <ellipse cx="0" cy="4" rx="7" ry="6" />
        <circle cx="0" cy="-5" r="5" />
        <path d="M-4 -8 L-6.4 -2 L-2.4 -4.6 Z" />
        <path d="M4 -8 L6.4 -2 L2.4 -4.6 Z" />
      </g>
      <circle cx="66" cy="80" r="0.9" fill={ring} opacity="0.6" />

      {/* a kitten, beside it */}
      <g opacity="0.55" fill={ring} transform="translate(82 90)">
        <ellipse cx="0" cy="3" rx="5.4" ry="4.6" />
        <circle cx="0" cy="-3.6" r="3.8" />
        <path d="M-3 -6.8 L-4.6 -2.4 L-1.2 -4.6 Z" />
        <path d="M3 -6.8 L4.6 -2.4 L1.2 -4.6 Z" />
        <path d="M5.4 3 Q9 1 8 -3" stroke={ring} strokeWidth="0.9" fill="none" />
      </g>

      {/* a ball of yarn */}
      <g opacity="0.5" transform="translate(30 92)">
        <circle r="4" fill={glow} />
        <path d="M-4 0 Q0 -4 4 0 Q0 4 -4 0" stroke={ring} strokeWidth="0.5" fill="none" opacity="0.6" />
        <path d="M0 -4 Q4 0 0 4 Q-4 0 0 -4" stroke={ring} strokeWidth="0.5" fill="none" opacity="0.5" />
      </g>
    </>
  ),
  trains: (
    <>
      {/* a tunnel, distant */}
      <g opacity="0.8">
        <path d="M70 50 Q76 32 84 32 Q92 32 96 50 Z" fill={ring} opacity="0.45" />
        <path d="M76 50 A8 14 0 0 1 90 50 Z" fill={ring} />
      </g>

      {/* a signal light */}
      <g opacity="0.7">
        <line x1="12" y1="30" x2="12" y2="14" stroke={ring} strokeWidth="0.6" />
        <circle cx="12" cy="12" r="1.6" fill={soft} />
        <circle cx="12" cy="12" r="0.8" fill={glow} opacity="0.7" style={{ animation: 'pz-twinkle 2.4s ease-in-out infinite' }} />
      </g>

      {/* the locomotive, with smoke */}
      <g opacity="0.75" fill={soft} transform="translate(46 70)">
        <rect x="-14" y="-10" width="24" height="14" rx="1.5" />
        <path d="M10 -10 L10 4 L18 4 L18 -4 Q18 -10 12 -10 Z" />
        <circle cx="-8" cy="6" r="2.6" fill={ring} opacity="0.85" />
        <circle cx="0" cy="6" r="2.6" fill={ring} opacity="0.85" />
        <circle cx="8" cy="6" r="2.6" fill={ring} opacity="0.85" />
        <rect x="-2" y="-18" width="3" height="8" fill={soft} />
      </g>
      <g fill={ring} opacity="0.3">
        <circle cx="43" cy="50" r="2" style={{ animation: 'pz-bob 5s ease-in-out infinite' }} />
        <circle cx="41" cy="42" r="1.6" style={{ animation: 'pz-bob 5.4s ease-in-out 1s infinite' }} />
        <circle cx="45" cy="36" r="1.2" style={{ animation: 'pz-bob 4.8s ease-in-out 2s infinite' }} />
      </g>

      {/* the tracks */}
      <g opacity="0.65">
        <line x1="0" y1="96" x2="100" y2="96" stroke={ring} strokeWidth="1" />
        <line x1="0" y1="99" x2="100" y2="99" stroke={ring} strokeWidth="1" />
        {Array.from({ length: 14 }, (_, index) => (
          <line key={index} x1={index * 8} y1="95" x2={index * 8 - 2} y2="100" stroke={ring} strokeWidth="0.8" />
        ))}
      </g>
    </>
  ),
  winter: (
    <>
      <g opacity="0.75" fill={ring}>
        <polygon points="14,58 8,74 20,74" />
        <polygon points="14,48 7,64 21,64" />
        <polygon points="14,38 8,54 20,54" />
        <rect x="12.5" y="74" width="3" height="4" />
      </g>
      <g opacity="0.5" fill={glow}>
        <ellipse cx="14" cy="58" rx="7" ry="1.6" />
        <ellipse cx="14" cy="48" rx="6" ry="1.4" />
      </g>

      <g opacity="0.55" fill={ring}>
        <polygon points="88,66 83,78 93,78" />
        <polygon points="88,58 84,70 92,70" />
        <rect x="86.8" y="78" width="2.4" height="3" />
      </g>

      {/* the igloo */}
      <g opacity="0.7" transform="translate(0 -14)">
        <path d="M74 96 A14 10 0 0 1 96 96 Z" fill={soft} />
        <path d="M84 92 A4 4 0 0 1 90 92 L90 96 L84 96 Z" fill={ring} />
        <path d="M85 93.4 A2.8 2.8 0 0 1 89 93.4 L89 96 L85 96 Z" fill={glow} opacity="0.6" />
      </g>

      {/* a penguin, waddling by */}
      <g opacity="0.6" fill={ring} transform="translate(44 92)">
        <ellipse cx="0" cy="0" rx="4" ry="6" />
        <ellipse cx="0" cy="1" rx="2.2" ry="4" fill={soft} opacity="0.85" />
        <path d="M-1.6 -4 L0 -6 L1.6 -4 Z" fill={glow} opacity="0.8" />
      </g>

      <Sparkles
        points={[
          [30, 20, 0],
          [60, 10, 1.4],
          [76, 30, 0.6],
        ]}
        duration={3.2}
      />
    </>
  ),
}
