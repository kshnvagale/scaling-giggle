"use client";

interface PersonaCardData {
  id: string;
  name: string;
  role: string;
  backstory: string;
  openingLine: string;
}

interface PersonaPickerProps {
  personas: PersonaCardData[];
  onSelect: (id: string) => void;
}

const AVATAR_COLORS = [
  "#264653", "#2a9d8f", "#e76f51", "#6d597a", "#355070",
];

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
}

export function PersonaPicker({ personas, onSelect }: PersonaPickerProps) {
  return (
    <div className="flex h-full">
      {/* Sidebar — Slack-style DM list */}
      <div className="w-[260px] flex-shrink-0 border-r border-[#e5e5e5] bg-[#f8f8f8] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <h3 className="text-[15px] font-bold text-[#1d1b16]">Direct Messages</h3>
          <p className="text-[12px] text-[#6b6557] mt-0.5">{personas.length} contacts</p>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-2.5 py-[6px] rounded-md bg-white border border-[#d5d5d5] text-[13px] text-[#9c9484]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span>Find someone...</span>
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {personas.map((persona, i) => (
            <button
              key={persona.id}
              onClick={() => onSelect(persona.id)}
              className="
                w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left
                transition-colors duration-75
                hover:bg-[#e8e8e8] active:bg-[#ddd]
              "
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {getInitials(persona.name)}
              </div>

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[#1d1b16] truncate">{persona.name}</span>
                  <span className="w-[7px] h-[7px] rounded-full bg-emerald-500 flex-shrink-0 border border-white" />
                </div>
                <p className="text-[11px] text-[#9c9484] truncate">{persona.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — detail view */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center px-8">
        <div className="max-w-md text-center">
          {/* Illustration placeholder */}
          <div className="w-16 h-16 rounded-2xl bg-[#f5f3f0] flex items-center justify-center text-3xl mx-auto mb-5">
            💬
          </div>

          <h2 className="text-xl font-bold text-[#1d1b16] tracking-tight">
            Start a conversation
          </h2>
          <p className="mt-2 text-[14px] text-[#6b6557] leading-relaxed">
            Select a contact from the sidebar to begin interviewing.
            Each stakeholder has unique knowledge about Meridian&apos;s systems and processes.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {personas.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="
                  flex items-center gap-2 px-3 py-1.5 rounded-full
                  border border-[#e5e5e5] bg-white text-[12px]
                  hover:bg-[#f5f3f0] hover:border-[#d0d0d0] transition-colors
                "
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {getInitials(p.name)}
                </div>
                <span className="text-[#1d1b16] font-medium">{p.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-lg bg-[#faf9f7] border border-[#e5e5e5] text-left">
            <p className="text-[12px] font-semibold text-[#6b6557] uppercase tracking-wider mb-2">
              Tip
            </p>
            <p className="text-[13px] text-[#6b6557] leading-relaxed">
              Each person knows different things — you&apos;ll need to talk to at least 2-3 experts to gather everything
              you need for your deliverable. Ask specific, targeted questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
