import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Home", icon: "⌂", to: "/", match: (pathname) => pathname === "/" },
  { label: "Meetings", icon: "◫", to: "/meetings", match: (pathname) => pathname.startsWith("/meetings") }
];

const AppShell = ({ title, subtitle, searchPlaceholder = "Search insights...", assistantPanel, children }) => {
  const location = useLocation();
  const hasAssistantPanel = Boolean(assistantPanel);

  return (
    <div className="min-h-screen bg-[#f9faf8] text-slate-900">
      <nav className="fixed left-0 top-0 z-40 hidden h-screen w-[132px] flex-col border-r border-[#dbe5dd] bg-[#f1f6f2] px-4 py-6 md:flex">
        <div className="mb-8 rounded-2xl border border-emerald-100 bg-white px-3 py-3 shadow-sm">
          <div className="text-lg font-black tracking-tight text-emerald-950">Meeting Hub</div>
          <div className="mt-1 text-[11px] font-medium text-slate-500">Meeting intelligence</div>
        </div>

        <div className="flex w-full flex-col gap-4">
          {navItems.map((item) => {
            const active = item.match(location.pathname);

            return (
              <Link
                key={item.label}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors ${active ? "bg-emerald-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-emerald-900"}`}
                to={item.to}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${active ? "bg-white/15" : "bg-emerald-100 text-emerald-900"}`}>
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <header className={`fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[#e7e8e6] bg-[#f9faf8]/95 px-4 backdrop-blur md:left-[132px] md:px-8 ${hasAssistantPanel ? "xl:right-[26rem]" : ""}`}>
        <div className="min-w-0">
          <div className="truncate text-lg font-extrabold tracking-tight text-emerald-950">{title}</div>
          {subtitle ? <div className="truncate text-xs font-medium text-slate-500">{subtitle}</div> : null}
        </div>

        <div className="hidden flex-1 px-8 lg:block">
          <div className="relative mx-auto max-w-xl">
            <input
              className="h-9 w-full rounded-xl border border-[#d7ddd8] bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>
        </div>
      </header>

      <main className={`px-4 pb-12 pt-20 md:ml-[132px] md:px-8 ${hasAssistantPanel ? "xl:mr-[26rem]" : ""}`}>
        {children}
      </main>

      {hasAssistantPanel ? (
        <aside className="fixed right-0 top-0 z-20 hidden h-screen w-[26rem] border-l border-[#dde4de] bg-[linear-gradient(180deg,#f7faf7_0%,#eef3ef_100%)] xl:block">
          <div className="h-full overflow-hidden px-4 py-4">
            <div className="h-full overflow-hidden rounded-[30px] border border-white/70 bg-white/55 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur">
              {assistantPanel}
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
};

export default AppShell;
