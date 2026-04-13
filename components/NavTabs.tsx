type NavTabsProps = {
  active: "chat" | "swipe";
};

export default function NavTabs({ active }: NavTabsProps) {
  return (
    <div className="mb-4 flex gap-2">
      <a
        href="/"
        className={`rounded px-4 py-2 text-sm font-semibold ${
          active === "chat"
            ? "bg-[#0d5477] text-white"
            : "bg-[#d7d7d7] text-black"
        }`}
      >
        Chat
      </a>
      <a
        href="/swipe"
        className={`rounded px-4 py-2 text-sm font-semibold ${
          active === "swipe"
            ? "bg-[#b86200] text-white"
            : "bg-[#d7d7d7] text-black"
        }`}
      >
        Swipe
      </a>
    </div>
  );
}
