"use client";

interface ClientBrandHeaderProps {
  clientName: string;
  size?: string;
  businessModel?: string;
  keyNumbers?: Record<string, string | number>;
  clientProfile?: string;
  role?: string;
}

interface BrandTheme {
  bg: string;
  accent: string;
  textOnBg: string;
  logo: React.ReactNode;
  tagline?: string;
}

function NetflixWordmark() {
  return (
    <svg
      viewBox="0 0 1024 276.74"
      className="h-9 w-auto"
      aria-label="Netflix"
    >
      <path
        fill="#FFFFFF"
        d="M140.803 258.904c-15.404 2.705-31.079 3.516-47.294 5.676l-49.458-144.856v151.073C28.687 272.43 14.902 274.59 0 277.024V0h41.08l56.212 157.021V0h43.51v258.904zm85.131-157.558c16.757 0 42.431-.811 57.835-.811v43.24c-19.189 0-41.619 0-57.835.811v64.322c25.405-1.621 50.809-3.785 76.482-4.596v41.617l-119.724 9.461V0h119.724v43.241h-76.482v58.105zm237.284-58.104h-44.862V242.13c-14.443 0-28.886 0-42.789.539V43.242H330.705V0h132.513v43.242zm70.266 56.484h59.187v43.24h-59.187v98.646h-42.52V0h121.076v43.241h-78.557v56.484zm148.667 103.512c24.594.539 49.456 2.434 73.51 3.785v42.701c-38.646-2.434-77.292-4.863-116.75-5.676V0h43.24v203.238zm109.994 49.457c13.902.812 28.617 1.623 42.789 3.243V0h-42.789v252.695zM1024 0l-55.404 132.973L1024 276.738c-16.217-2.162-32.434-5.135-48.648-7.838l-31.354-80.812-31.892 74.325c-15.674-2.703-30.808-3.514-46.483-5.676L926.704 132.7 875.084 0h46.482l28.617 73.51L980.757 0H1024z"
      />
    </svg>
  );
}

function getBrandTheme(clientName: string): BrandTheme {
  const lower = clientName.toLowerCase();

  if (lower === "netflix") {
    return {
      bg: "linear-gradient(135deg, #000000 0%, #1a1a1a 60%, #2b0a0a 100%)",
      accent: "#E50914",
      textOnBg: "#FFFFFF",
      logo: <NetflixWordmark />,
      tagline: "Content Strategy & Insights",
    };
  }

  // Generic fallback for any other client
  return {
    bg: "linear-gradient(135deg, #1c1917 0%, #44403c 100%)",
    accent: "#a8a29e",
    textOnBg: "#FFFFFF",
    logo: (
      <div className="text-2xl font-bold tracking-tight text-white">
        {clientName}
      </div>
    ),
    tagline: undefined,
  };
}

function formatKey(key: string): string {
  // catalogSize → Catalog size
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function ClientBrandHeader({
  clientName,
  size,
  businessModel,
  keyNumbers,
  clientProfile,
  role,
}: ClientBrandHeaderProps) {
  const theme = getBrandTheme(clientName);
  const keyEntries = keyNumbers ? Object.entries(keyNumbers) : [];

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-stone-200 shadow-sm">
      {/* Branded header band */}
      <div
        className="px-6 py-5"
        style={{
          background: theme.bg,
          color: theme.textOnBg,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {theme.logo}
            {theme.tagline && (
              <>
                <div
                  className="h-7 w-px"
                  style={{ background: "rgba(255,255,255,0.25)" }}
                />
                <div
                  className="text-xs font-medium uppercase tracking-[0.2em]"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {theme.tagline}
                </div>
              </>
            )}
          </div>
          {role && (
            <div
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: theme.accent,
                color: theme.textOnBg,
              }}
            >
              {role}
            </div>
          )}
        </div>
      </div>

      {/* Stat strip */}
      {keyEntries.length > 0 && (
        <div className="grid border-y border-stone-200 bg-white" style={{ gridTemplateColumns: `repeat(${keyEntries.length}, minmax(0, 1fr))` }}>
          {keyEntries.map(([k, v], idx) => (
            <div
              key={k}
              className={`px-5 py-3 ${idx > 0 ? "border-l border-stone-200" : ""}`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                {formatKey(k)}
              </div>
              <div className="mt-1 text-sm font-semibold text-stone-900">
                {String(v)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile body */}
      {(clientProfile || businessModel) && (
        <div className="bg-white px-6 py-5">
          {businessModel && (
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
              {businessModel}
            </div>
          )}
          {clientProfile && (
            <div className="space-y-3 text-sm leading-relaxed text-stone-700 whitespace-pre-line">
              {clientProfile}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
