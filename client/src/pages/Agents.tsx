import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Agent } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Phone, Mail } from "lucide-react";
import { useState } from "react";

const AGENT_COLORS = ["bg-blue-500", "bg-amber-500", "bg-green-500", "bg-rose-500", "bg-purple-500"];

export default function AgentsPage() {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: () => apiRequest("GET", "/api/agents").then(r => r.json()),
  });

  const toggleMutation = useMutation({
    mutationFn: (agent: Agent) =>
      apiRequest("PATCH", `/api/agents/${agent.id}`, { isActive: !agent.isActive }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agents"] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Agents</h1>
          <p className="text-sm text-muted-foreground">{agents.filter(a => a.isActive).length} active agents</p>
        </div>
        <button
          data-testid="button-new-agent"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Add Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent, i) => (
          <Card key={agent.id} data-testid={`card-agent-${agent.id}`} className={!agent.isActive ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${AGENT_COLORS[i % AGENT_COLORS.length]}`}>
                    {agent.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{agent.name}</div>
                    <Badge variant="outline" className="text-xs mt-0.5 capitalize">
                      {agent.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    data-testid={`button-edit-agent-${agent.id}`}
                    onClick={() => setEditing(agent)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  ><Pencil size={12} /></button>
                  <Switch
                    data-testid={`switch-agent-${agent.id}`}
                    checked={agent.isActive}
                    onCheckedChange={() => toggleMutation.mutate(agent)}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {agent.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail size={11} /> {agent.email}
                  </div>
                )}
                {agent.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone size={11} /> {agent.phone}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(creating || editing) && (
        <AgentModal existing={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}
    </div>
  );
}

function AgentModal({ existing, onClose }: { existing: Agent | null; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    role: existing?.role ?? "agent",
    isActive: existing?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiRequest("PATCH", `/api/agents/${existing.id}`, data).then(r => r.json())
      : apiRequest("POST", "/api/agents", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: isEdit ? "Agent updated" : "Agent created" });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-base">{isEdit ? "Edit Agent" : "New Agent"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
            <input data-testid="input-agent-name" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input data-testid="input-agent-email" type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <input data-testid="input-agent-phone" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Role</label>
            <select data-testid="select-agent-role" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none">
              <option value="agent">Agent</option>
              <option value="team_lead">Team Lead</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            <span className="text-sm">Active</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" data-testid="button-save-agent"
              disabled={saveMutation.isPending}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saveMutation.isPending ? "Saving…" : isEdit ? "Update Agent" : "Add Agent"}
            </button>
            <button type="button" onClick={onClose}
              className="border rounded-lg px-5 py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
