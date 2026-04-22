import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sequence } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Mail, Phone, Radio, GitBranch, Plus, ChevronDown, ChevronUp,
  Zap, Clock, Tag, Pencil, Trash2
} from "lucide-react";
import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  cold_lead: "Cold Lead",
  handraiser: "Handraiser",
  past_client: "Past Client",
  referral: "Referral",
  speed_to_lead: "Speed-to-Lead",
  listing_engagement: "Listing Engagement",
  revival: "Revival",
  open_house: "Open House",
  price_drop: "Price Drop",
  anniversary: "Anniversary",
};

const STEP_ICONS: Record<string, React.ElementType> = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
  voicemail: Radio,
};
const STEP_COLORS: Record<string, string> = {
  sms: "text-blue-500",
  email: "text-purple-500",
  call: "text-green-500",
  voicemail: "text-orange-500",
};
const STEP_BG: Record<string, string> = {
  sms: "bg-blue-50 dark:bg-blue-900/20",
  email: "bg-purple-50 dark:bg-purple-900/20",
  call: "bg-green-50 dark:bg-green-900/20",
  voicemail: "bg-orange-50 dark:bg-orange-900/20",
};

type Step = { day: number; type: string; label: string };

export default function SequencesPage() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const { data: sequences = [], isLoading } = useQuery<Sequence[]>({
    queryKey: ["/api/sequences"],
    queryFn: () => apiRequest("GET", "/api/sequences").then(r => r.json()),
  });

  const toggleMutation = useMutation({
    mutationFn: (seq: Sequence) =>
      apiRequest("PATCH", `/api/sequences/${seq.id}`, { isActive: !seq.isActive }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sequences"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sequences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      toast({ title: "Sequence deleted" });
    },
  });

  const filtered = sequences.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.trigger.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || s.category === filterCat;
    return matchSearch && matchCat;
  });

  const activeCount = sequences.filter(s => s.isActive).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Automation Sequences</h1>
          <p className="text-sm text-muted-foreground">{activeCount} of {sequences.length} sequences active</p>
        </div>
        <button
          data-testid="button-new-sequence"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Sequence
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search sequences…"
          data-testid="input-search-sequences"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm bg-card w-56 focus:ring-2 focus:ring-primary outline-none"
        />
        <select
          data-testid="select-category-filter"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm bg-card focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Sequence Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(seq => {
            const steps: Step[] = JSON.parse(seq.stepsJson);
            const isExpanded = expanded === seq.id;

            return (
              <Card key={seq.id} data-testid={`card-sequence-${seq.id}`} className={`transition-all ${!seq.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-0">
                  {/* Collapsed Header */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Toggle */}
                    <Switch
                      data-testid={`switch-sequence-${seq.id}`}
                      checked={seq.isActive}
                      onCheckedChange={() => toggleMutation.mutate(seq)}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{seq.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${seq.category}`}>
                          {CATEGORY_LABELS[seq.category]}
                        </span>
                        {seq.triggerTag && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag size={10} /> {seq.triggerTag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Zap size={10} /> {seq.trigger}
                      </p>
                    </div>

                    {/* Step summary pills */}
                    <div className="hidden md:flex items-center gap-1.5">
                      {steps.map((step, i) => {
                        const Icon = STEP_ICONS[step.type] ?? MessageSquare;
                        return (
                          <div
                            key={i}
                            title={`Day ${step.day}: ${step.label}`}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STEP_BG[step.type]} ${STEP_COLORS[step.type]}`}
                          >
                            <Icon size={10} />
                            D{step.day}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        data-testid={`button-edit-sequence-${seq.id}`}
                        onClick={() => setEditing(seq)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      ><Pencil size={13} /></button>
                      <button
                        data-testid={`button-delete-sequence-${seq.id}`}
                        onClick={() => { if (confirm("Delete this sequence?")) deleteMutation.mutate(seq.id); }}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      ><Trash2 size={13} /></button>
                      <button
                        data-testid={`button-expand-sequence-${seq.id}`}
                        onClick={() => setExpanded(isExpanded ? null : seq.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                      >{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                    </div>
                  </div>

                  {/* Expanded Steps */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4">
                      <p className="text-xs text-muted-foreground py-3">{seq.description}</p>
                      <div className="space-y-2">
                        {steps.map((step, idx) => {
                          const Icon = STEP_ICONS[step.type] ?? MessageSquare;
                          return (
                            <div key={idx} className="step-line flex items-start gap-3 relative pb-2">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${STEP_BG[step.type]}`}>
                                <Icon size={14} className={STEP_COLORS[step.type]} />
                              </div>
                              <div className="flex-1 pt-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{step.label}</span>
                                  <Badge variant="outline" className="text-xs">
                                    <Clock size={9} className="mr-1" />
                                    Day {step.day}
                                  </Badge>
                                  <Badge variant="outline" className={`text-xs capitalize ${STEP_COLORS[step.type]}`}>
                                    {step.type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No sequences found. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(creating || editing) && (
        <SequenceModal
          existing={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function SequenceModal({ existing, onClose }: { existing: Sequence | null; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!existing;

  const defaultSteps: Step[] = existing ? JSON.parse(existing.stepsJson) : [
    { day: 0, type: "sms", label: "Initial Text" }
  ];

  const [form, setForm] = useState({
    name: existing?.name ?? "",
    trigger: existing?.trigger ?? "",
    triggerTag: existing?.triggerTag ?? "",
    description: existing?.description ?? "",
    category: existing?.category ?? "cold_lead",
    isActive: existing?.isActive ?? true,
  });
  const [steps, setSteps] = useState<Step[]>(defaultSteps);

  const saveMutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiRequest("PATCH", `/api/sequences/${existing.id}`, data).then(r => r.json())
      : apiRequest("POST", "/api/sequences", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      toast({ title: isEdit ? "Sequence updated" : "Sequence created" });
      onClose();
    },
  });

  function addStep() {
    setSteps(prev => [...prev, { day: 0, type: "sms", label: "New Step" }]);
  }

  function updateStep(i: number, field: keyof Step, value: any) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate({ ...form, stepsJson: JSON.stringify(steps) });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-base">{isEdit ? "Edit Sequence" : "New Sequence"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sequence Name</label>
              <input
                data-testid="input-sequence-name"
                required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. Cold Lead Follow-Up"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select
                data-testid="select-sequence-category"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Trigger Description</label>
              <input
                data-testid="input-sequence-trigger"
                required value={form.trigger}
                onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. Lead added with no response for 48h"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">FUB Tag (optional)</label>
              <input
                data-testid="input-sequence-tag"
                value={form.triggerTag}
                onChange={e => setForm(f => ({ ...f, triggerTag: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. cold-lead"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <span className="text-sm">{form.isActive ? "Active" : "Paused"}</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <textarea
                data-testid="input-sequence-description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none resize-none"
                rows={2}
                placeholder="Short description of this sequence's purpose"
              />
            </div>
          </div>

          {/* Steps Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sequence Steps</label>
              <button type="button" onClick={addStep}
                className="text-xs text-primary underline underline-offset-2">+ Add Step</button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                  <select
                    value={step.type}
                    onChange={e => updateStep(i, "type", e.target.value)}
                    className="border rounded px-2 py-1 text-xs bg-card"
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="voicemail">Voicemail</option>
                  </select>
                  <input
                    type="number" min={0}
                    value={step.day}
                    onChange={e => updateStep(i, "day", Number(e.target.value))}
                    className="border rounded px-2 py-1 text-xs bg-card w-16"
                    placeholder="Day"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                  <input
                    value={step.label}
                    onChange={e => updateStep(i, "label", e.target.value)}
                    className="border rounded px-2 py-1 text-xs bg-card flex-1"
                    placeholder="Step label"
                  />
                  <button type="button" onClick={() => removeStep(i)}
                    className="text-muted-foreground hover:text-destructive p-0.5 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" data-testid="button-save-sequence"
              disabled={saveMutation.isPending}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saveMutation.isPending ? "Saving…" : isEdit ? "Update Sequence" : "Create Sequence"}
            </button>
            <button type="button" onClick={onClose}
              className="border rounded-lg px-5 py-2 text-sm hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
