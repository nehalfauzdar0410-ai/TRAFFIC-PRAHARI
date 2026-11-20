export function BrandLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="4" fill="#24282C" />
      <path
        d="M8 25L13.5 7H18.5L24 25"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <path
        d="M16 10V13.5M16 17V20.5M16 23.5V25"
        stroke="#92969A"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <circle cx="16" cy="7" r="2.75" fill="#F15A24" />
    </svg>
  );
}

export function RoadNetworkGraphic() {
  return (
    <div className="relative w-full h-full min-h-[260px] bg-[#24282C] border border-[#343A40] overflow-hidden flex flex-col justify-between p-5">
      {/* Subtle coordinate header */}
      <div className="flex items-center justify-between gap-4 relative z-10">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#92969A]">
          COMMUNITY ROAD SAFETY
        </span>
        <span className="text-[11px] font-mono text-[#F15A24] tabular-nums">
          GRID SECTOR 04
        </span>
      </div>

      {/* Architectural Road Network SVG */}
      <svg
        viewBox="0 0 460 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-44 sm:h-48 my-2"
        aria-hidden="true"
      >
        {/* Subtle Urban Block Grid */}
        <path
          d="M0 40H460M0 100H460M0 160H460M0 210H460M70 0V240M170 0V240M290 0V240M390 0V240"
          stroke="#2E3338"
          strokeWidth="1"
        />

        {/* Secondary Connector Corridors */}
        <path
          d="M20 190L130 130L230 130L340 60L440 60"
          stroke="#3E454C"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M90 25L180 130L270 195L420 195"
          stroke="#3E454C"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Primary Arterial Highway */}
        <path
          d="M0 130H460"
          stroke="#171A1D"
          strokeWidth="22"
        />
        <path
          d="M230 0V240"
          stroke="#171A1D"
          strokeWidth="20"
        />

        {/* Roundabout Junction */}
        <circle cx="230" cy="130" r="30" fill="#171A1D" stroke="#4B5259" strokeWidth="2" />
        <circle cx="230" cy="130" r="14" fill="#24282C" stroke="#F15A24" strokeWidth="1.5" />

        {/* Crisp Dashed Road Markings */}
        <path
          d="M8 130H192M268 130H452"
          stroke="#92969A"
          strokeWidth="1.5"
          strokeDasharray="8 7"
        />
        <path
          d="M230 8V92M230 168V232"
          stroke="#92969A"
          strokeWidth="1.5"
          strokeDasharray="8 7"
        />

        {/* Active Geolocation & Incident Nodes */}
        <circle cx="130" cy="130" r="9" fill="#F15A24" fillOpacity="0.22" />
        <circle cx="130" cy="130" r="4.5" fill="#F15A24" stroke="#FFFFFF" strokeWidth="1.5" />

        <circle cx="340" cy="60" r="9" fill="#F15A24" fillOpacity="0.22" />
        <circle cx="340" cy="60" r="4.5" fill="#F15A24" stroke="#FFFFFF" strokeWidth="1.5" />

        <circle cx="230" cy="130" r="4.5" fill="#FFFFFF" />
        <circle cx="355" cy="195" r="4" fill="#92969A" stroke="#FFFFFF" strokeWidth="1.2" />
      </svg>

      {/* Bottom Spatial Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#343A40] text-[11px] font-mono text-[#92969A] relative z-10">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F15A24]" />
          <span>Pinned Incident Corridor</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" />
          <span>Junction Telemetry</span>
        </span>
      </div>
    </div>
  );
}
