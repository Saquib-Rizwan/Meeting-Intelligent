import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: "D", to: "/", match: (pathname) => pathname === "/" },
  { label: "Meetings", icon: "M", to: "/", match: (pathname) => pathname.startsWith("/meetings/") },
  { label: "Actions", icon: "A", to: "/", match: () => false },
  { label: "Settings", icon: "S", to: "/", match: () => false }
];

const AppShell = ({ title, subtitle, searchPlaceholder = "Search insights...", assistantPanel, children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <nav className="fixed left-0 top-0 z-40 hidden h-screen w-20 flex-col items-center border-r border-slate-200/70 bg-slate-50 py-8 md:flex">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xs font-extrabold tracking-[0.2em] text-white">
          MIH
        </div>

        <div className="flex w-full flex-col gap-4">
          {navItems.map((item) => {
            const active = item.match(location.pathname);

            return (
              <Link
                key={item.label}
                className={`flex w-full flex-col items-center py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${active ? "border-r-2 border-indigo-600 bg-white text-indigo-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
                to={item.to}
              >
                <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-current/10 text-xs">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur md:left-20 md:px-8 xl:right-[20rem]">
        <div className="min-w-0">
          <div className="truncate text-lg font-bold text-slate-900">{title}</div>
          {subtitle ? <div className="truncate text-xs text-slate-500">{subtitle}</div> : null}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <div className="relative">
            <input
              className="w-72 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            AI
          </div>
        </div>
      </header>

      <main className="px-4 pb-10 pt-24 md:ml-20 md:px-8 xl:mr-[20rem]">
        {children}
      </main>

      <aside className="fixed right-0 top-0 z-20 hidden h-screen w-[20rem] flex-col border-l border-slate-200 bg-white px-5 py-6 xl:flex">
        <div className="mb-5 border-b border-slate-100 pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Ask AI</p>
          <p className="mt-1 text-xs text-slate-500">Intelligent Meeting Assistant</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{assistantPanel}</div>
      </aside>
    </div>
  );
};

export default AppShell;
