type SidebarUser = {
  id: number;
  name: string;
  image: string;
};

type SidebarProps = {
  activeTab: "top" | "matches";
  onTabChange: (tab: "top" | "matches") => void;
  onToggleMode?: () => void;
  inSwipeMode?: boolean;
  cameraEnabled?: boolean;
  micEnabled?: boolean;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
};

const TOP_USERS: SidebarUser[] = [
  { id: 1, name: "Alex", image: "https://picsum.photos/seed/top1/120/120" },
  { id: 2, name: "Nina", image: "https://picsum.photos/seed/top2/120/120" },
  { id: 3, name: "Leo", image: "https://picsum.photos/seed/top3/120/120" },
  { id: 4, name: "Mia", image: "https://picsum.photos/seed/top4/120/120" },
  { id: 5, name: "Adam", image: "https://picsum.photos/seed/top5/120/120" },
  { id: 6, name: "Emma", image: "https://picsum.photos/seed/top6/120/120" },
];

const MY_MATCHES: SidebarUser[] = [
  { id: 7, name: "Sofia", image: "https://picsum.photos/seed/match1/120/120" },
  { id: 8, name: "Liam", image: "https://picsum.photos/seed/match2/120/120" },
  { id: 9, name: "Olivia", image: "https://picsum.photos/seed/match3/120/120" },
  { id: 10, name: "Noah", image: "https://picsum.photos/seed/match4/120/120" },
  { id: 11, name: "Ema", image: "https://picsum.photos/seed/match5/120/120" },
  { id: 12, name: "David", image: "https://picsum.photos/seed/match6/120/120" },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  onToggleMode,
  inSwipeMode = false,
  cameraEnabled = true,
  micEnabled = true,
  onToggleCamera,
  onToggleMic,
}: SidebarProps) {
  const users = activeTab === "top" ? TOP_USERS : MY_MATCHES;

  return (
    <aside className="flex w-[280px] flex-col bg-[#d7d7d7] text-black">
      <div className="flex items-center justify-between bg-[#4b0707] px-4 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white">
            <img
              src="https://picsum.photos/seed/meuser/120/120"
              alt="Tvoj profil"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-sm font-semibold">Tvoj profil</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCamera}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
            title="Kamera"
            type="button"
          >
            {cameraEnabled ? "📹" : "🚫"}
          </button>
          <button
            onClick={onToggleMic}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
            title="Mikrofón"
            type="button"
          >
            {micEnabled ? "🎤" : "🔇"}
          </button>
          <button
            onClick={onToggleMode}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
            title="Prepni režim"
            type="button"
          >
            {inSwipeMode ? "💬" : "🔥"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 bg-[#cfcfcf] text-center text-xs font-bold uppercase">
        <button
          onClick={() => onTabChange("top")}
          className={`px-3 py-3 ${
            activeTab === "top" ? "bg-[#bfbfbf] text-white" : "text-[#666]"
          }`}
          type="button"
        >
          Top užívatelia
        </button>
        <button
          onClick={() => onTabChange("matches")}
          className={`px-3 py-3 ${
            activeTab === "matches" ? "bg-[#bfbfbf] text-white" : "text-[#666]"
          }`}
          type="button"
        >
          Moje zhody
        </button>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto p-5">
        {users.map((user) => (
          <div key={user.id} className="space-y-2">
            <div className="aspect-square overflow-hidden bg-white shadow-sm">
              <img
                src={user.image}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="truncate text-center text-xs font-medium text-[#444]">
              {user.name}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
