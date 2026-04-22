import { Link, useLocation } from "wouter";
import { LayoutDashboard, GitBranch, FileText, Users, Zap } from "lucide-react";

const nav = [
  { href: "/", label: "Activity Dashboard", icon: LayoutDashboard },
  { href: "/sequences", label: "Sequences", icon: GitBranch },
  { href: "/scripts", label: "Script Library", icon: FileText },
  { href: "/agents", label: "Agents", icon: Users },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside
      style={{ background: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))" }}
      className="flex flex-col h-full overflow-y-auto"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <svg aria-label="FUB Workflow" viewBox="0 0 32 32" width="28" height="28" fill="none">
          <rect width="32" height="32" rx="8" fill="hsl(var(--sidebar-primary))" />
          <path d="M8 10h10M8 16h7M8 22h10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="22" r="4" fill="hsl(43 96% 50%)" />
        </svg>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>
            FUB Automator
          </div>
          <div className="text-xs" style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.6 }}>
            Follow Up Boss
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="text-xs font-semibold uppercase tracking-wider px-2 pb-2 opacity-40">Workspace</div>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}>
              <a
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active ? "sidebar-active" : "hover:bg-white/5"
                }`}
                style={{
                  color: active ? "hsl(var(--sidebar-accent-foreground))" : "hsl(var(--sidebar-foreground))",
                }}
              >
                <Icon size={16} />
                {label}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex items-center gap-2">
          <Zap size={12} style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs opacity-50">10 Active Sequences</span>
        </div>
      </div>
    </aside>
  );
}
