import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ActivityLog, Agent } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from "recharts";
import {
  Phone, Clock, MessageSquare, Calendar, TrendingUp, TrendingDown, Minus,
  Mail, Radio, UserPlus
} from "lucide-react";
import { useState } from "react";

const today = new Date().toISOString().slice(0, 10);

const AGENT_COLORS = ["hsl(222,84%,38%)", "hsl(43,96%,45%)", "hsl(142,71%,38%)", "hsl(0,72%,51%)"];

function fmt(n: number) { return n.toLocaleString(); }
function fmtMin(m: number) {
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function Delta({ pct }: { pct: number }) {
  if (pct > 0) return <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 text-xs tabular"><TrendingUp size={12} />+{pct}%</span>;
  if (pct < 0) return <span className="flex items-center gap-0.5 text-red-500 text-xs tabular"><TrendingDown size={12} />{pct}%</span>;
  return <span className="flex items-center gap-0.5 text-muted-foreground text-xs tabular"><Minus size={12} />0%</span>;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: () => apiRequest("GET", "/api/agents").then(r => r.json()),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/activity/stats", selectedDate],
    queryFn: () => apiRequest("GET", `/api/activity/stats/${selectedDate}`).then(r => r.json()),
  });

  const { data: allLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
    queryFn: () => apiRequest("GET", "/api/activity").then(r => r.json()),
  });

  // Build 7-day trend data
  const trendDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const trendData = trendDates.map(date => {
    const dayLogs = allLogs.filter(l => l.date === date);
    const dials = dayLogs.reduce((s, l) => s + l.dials, 0);
    const conversations = dayLogs.reduce((s, l) => s + l.conversations, 0);
    const appointments = dayLogs.reduce((s, l) => s + l.appointments, 0);
    return {
      date: date.slice(5), // MM-DD
      dials,
      conversations,
      appointments,
      contactRate: dials > 0 ? Math.round((conversations / dials) * 100) : 0,
    };
  });

  // Agent leaderboard for selected date
  const agentData = agents.map((agent, i) => {
    const log = allLogs.find(l => l.agentId === agent.id && l.date === selectedDate);
    const dials = log?.dials ?? 0;
    const convs = log?.conversations ?? 0;
    return {
      agent,
      dials,
      conversations: convs,
      talkTime: log?.talkTimeMinutes ?? 0,
      appointments: log?.appointments ?? 0,
      texts: log?.textsSent ?? 0,
      emails: log?.emailsSent ?? 0,
      contactRate: dials > 0 ? Math.round((convs / dials) * 100) : 0,
      color: AGENT_COLORS[i % AGENT_COLORS.length],
    };
  }).sort((a, b) => b.dials - a.dials);

  const kpis = [
    { label: "Total Dials", value: stats?.dials ?? 0, fmt: fmt, icon: Phone, delta: 8, color: "text-blue-600" },
    { label: "Talk Time", value: stats?.talkTime ?? 0, fmt: fmtMin, icon: Clock, delta: 3, color: "text-purple-600" },
    { label: "Contacts Made", value: stats?.conversations ?? 0, fmt: fmt, icon: MessageSquare, delta: -2, color: "text-green-600" },
    { label: "Contact Rate", value: stats?.contactRate ?? 0, fmt: (v: number) => `${v}%`, icon: TrendingUp, delta: 5, color: "text-orange-600" },
    { label: "Appointments Set", value: stats?.appointments ?? 0, fmt: fmt, icon: Calendar, delta: 12, color: "text-rose-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Activity Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Daily performance across all agents</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Date</label>
          <input
            type="date"
            data-testid="input-date-filter"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(({ label, value, fmt: f, icon: Icon, delta, color }) => (
          <Card key={label} className="kpi-card" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4">
              {statsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium">{label}</span>
                    <Icon size={14} className={color} />
                  </div>
                  <div className={`text-2xl font-bold tabular ${color}`}>{f(value)}</div>
                  <div className="mt-1"><Delta pct={delta} /></div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-Day Dial Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">7-Day Dial & Contact Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="dials" stroke="hsl(222,84%,38%)" strokeWidth={2} dot={false} name="Dials" />
                <Line type="monotone" dataKey="conversations" stroke="hsl(142,71%,38%)" strokeWidth={2} dot={false} name="Contacts" />
                <Line type="monotone" dataKey="appointments" stroke="hsl(43,96%,45%)" strokeWidth={2} dot={false} name="Appointments" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Dials Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Agent Activity — {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agentData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="agent.name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, name: string) => [v, name]}
                />
                <Bar dataKey="dials" name="Dials" radius={[4, 4, 0, 0]}>
                  {agentData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Bar>
                <Bar dataKey="conversations" name="Contacts" fill="hsl(142,71%,38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Leaderboard Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Agent Leaderboard</CardTitle>
            <Badge variant="outline" className="text-xs">{selectedDate}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Agent</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">
                    <span className="flex items-center gap-1 justify-end"><Phone size={10} /> Dials</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">
                    <span className="flex items-center gap-1 justify-end"><Clock size={10} /> Talk Time</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">
                    <span className="flex items-center gap-1 justify-end"><MessageSquare size={10} /> Contacts</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Contact Rate</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">
                    <span className="flex items-center gap-1 justify-end"><Calendar size={10} /> Appts</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">
                    <span className="flex items-center gap-1 justify-end"><Mail size={10} /> Texts</span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">
                    <span className="flex items-center gap-1 justify-end"><Radio size={10} /> VMs</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {agentData.map((row, i) => (
                  <tr key={row.agent.id} data-testid={`row-agent-${row.agent.id}`} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground tabular font-medium">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: row.color }}
                        >
                          {row.agent.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="font-medium text-xs">{row.agent.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{row.agent.role.replace("_", " ")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular font-semibold" data-testid={`text-dials-${row.agent.id}`}>{fmt(row.dials)}</td>
                    <td className="px-4 py-3 text-right tabular text-muted-foreground">{fmtMin(row.talkTime)}</td>
                    <td className="px-4 py-3 text-right tabular">{fmt(row.conversations)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge
                        variant="outline"
                        className={`text-xs tabular ${row.contactRate >= 20 ? "text-green-600 border-green-200" : row.contactRate >= 10 ? "text-yellow-600 border-yellow-200" : "text-red-500 border-red-200"}`}
                      >
                        {row.contactRate}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular font-medium text-primary">{fmt(row.appointments)}</td>
                    <td className="px-4 py-3 text-right tabular text-muted-foreground">{fmt(row.texts)}</td>
                    <td className="px-4 py-3 text-right tabular text-muted-foreground">
                      {allLogs.find(l => l.agentId === row.agent.id && l.date === selectedDate)?.voicemails ?? 0}
                    </td>
                  </tr>
                ))}
                {agentData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">No activity logged for this date.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Log Activity Button */}
      <LogActivityForm agents={agents} selectedDate={selectedDate} />
    </div>
  );
}

// Inline log activity form
function LogActivityForm({ agents, selectedDate }: { agents: Agent[]; selectedDate: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    agentId: 0, date: selectedDate, dials: 0, talkTimeMinutes: 0,
    conversations: 0, appointments: 0, textsSent: 0, emailsSent: 0, voicemails: 0, newLeads: 0,
  });

  const { refetch } = useQuery<ActivityLog[]>({ queryKey: ["/api/activity"], queryFn: () => apiRequest("GET", "/api/activity").then(r => r.json()) });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await apiRequest("POST", "/api/activity", { ...form, agentId: Number(form.agentId) });
    queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity/stats"] });
    setOpen(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Log Daily Activity</CardTitle>
        <button
          data-testid="button-toggle-log"
          onClick={() => setOpen(!open)}
          className="text-xs text-primary underline underline-offset-2"
        >{open ? "Cancel" : "Add Entry"}</button>
      </CardHeader>
      {open && (
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="form-log-activity">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Agent</label>
              <select
                data-testid="select-agent"
                className="w-full border rounded-md px-3 py-2 text-sm bg-card"
                value={form.agentId}
                onChange={e => setForm(f => ({ ...f, agentId: Number(e.target.value) }))}
                required
              >
                <option value={0} disabled>Select agent…</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <input type="date" className="w-full border rounded-md px-3 py-2 text-sm bg-card" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            {[
              ["Dials", "dials"], ["Talk Time (min)", "talkTimeMinutes"], ["Contacts", "conversations"],
              ["Appointments", "appointments"], ["Texts Sent", "textsSent"], ["Emails Sent", "emailsSent"],
              ["Voicemails", "voicemails"], ["New Leads", "newLeads"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input
                  type="number" min={0}
                  data-testid={`input-${key}`}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-card"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                />
              </div>
            ))}
            <div className="col-span-2 md:col-span-4">
              <button type="submit" data-testid="button-submit-log"
                className="bg-primary text-primary-foreground rounded-md px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                Save Activity Log
              </button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}

// Need queryClient for form invalidation
import { queryClient } from "@/lib/queryClient";
