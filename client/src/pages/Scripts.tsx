import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Script, Sequence } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Mail, Phone, Radio, Plus, Pencil, Trash2, Copy, Eye
} from "lucide-react";
import { useState, useMemo } from "react";

const TYPE_ICONS: Record<string, React.ElementType> = {
  sms: MessageSquare, email: Mail, call: Phone, voicemail: Radio,
};
const TYPE_COLORS: Record<string, string> = {
  sms: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  email: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  call: "text-green-500 bg-green-50 dark:bg-green-900/20",
  voicemail: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
};

const MERGE_FIELD_REGEX = /\[([^\]]+)\]/g;

function renderWithMergeFields(text: string) {
  const parts: Array<{ text: string; isMerge: boolean }> = [];
  let last = 0;
  let match;
  const regex = /\[([^\]]+)\]/g;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), isMerge: false });
    parts.push({ text: match[0], isMerge: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isMerge: false });
  return parts.map((p, i) =>
    p.isMerge
      ? <span key={i} className="merge-field">{p.text}</span>
      : <span key={i}>{p.text}</span>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  cold_lead: "Cold Lead", handraiser: "Handraiser", past_client: "Past Client",
  referral: "Referral", speed_to_lead: "Speed-to-Lead", listing_engagement: "Listing Engagement",
  revival: "Revival", open_house: "Open House", price_drop: "Price Drop", anniversary: "Anniversary",
};

export default function ScriptsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Script | null>(null);
  const [previewing, setPreviewing] = useState<Script | null>(null);

  const { data: scripts = [], isLoading } = useQuery<Script[]>({
    queryKey: ["/api/scripts"],
    queryFn: () => apiRequest("GET", "/api/scripts").then(r => r.json()),
  });

  const { data: sequences = [] } = useQuery<Sequence[]>({
    queryKey: ["/api/sequences"],
    queryFn: () => apiRequest("GET", "/api/sequences").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scripts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      toast({ title: "Script deleted" });
    },
  });

  const filtered = scripts.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || s.body.toLowerCase().includes(q);
    const matchType = filterType === "all" || s.type === filterType;
    const matchCat = filterCat === "all" || s.category === filterCat;
    return matchSearch && matchType && matchCat;
  });

  function copyScript(script: Script) {
    navigator.clipboard.writeText(script.body);
    toast({ title: "Script copied to clipboard" });
  }

  const mergeFieldsExtracted = (body: string) => {
    const fields = new Set<string>();
    let m;
    const r = /\[([^\]]+)\]/g;
    while ((m = r.exec(body)) !== null) fields.add(m[1]);
    return Array.from(fields);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Script Library</h1>
          <p className="text-sm text-muted-foreground">{scripts.length} scripts with customizable merge fields</p>
        </div>
        <button
          data-testid="button-new-script"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Script
        </button>
      </div>

      {/* Merge Field Guide */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
        <CardContent className="p-3">
          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1.5">Merge Fields — wrap any variable in square brackets</p>
          <div className="flex flex-wrap gap-1.5">
            {["[Name]", "[Your Name]", "[Area]", "[Address]", "[Price]", "[Referrer Name]", "[Brokerage]", "[Calendar Link]", "[Years]", "[Available Times]"].map(f => (
              <span key={f} className="merge-field">{f}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search scripts…"
          data-testid="input-search-scripts"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm bg-card w-56 focus:ring-2 focus:ring-primary outline-none"
        />
        <select
          data-testid="select-type-filter"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm bg-card focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="all">All Types</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="call">Call Script</option>
          <option value="voicemail">Voicemail</option>
        </select>
        <select
          data-testid="select-cat-filter"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm bg-card focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Scripts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(script => {
            const Icon = TYPE_ICONS[script.type] ?? MessageSquare;
            const fields = mergeFieldsExtracted(script.body);
            const seq = sequences.find(s => s.id === script.sequenceId);

            return (
              <Card key={script.id} data-testid={`card-script-${script.id}`} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${TYPE_COLORS[script.type]}`}>
                        <Icon size={13} />
                      </div>
                      <span className="font-semibold text-sm">{script.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        data-testid={`button-preview-script-${script.id}`}
                        onClick={() => setPreviewing(script)}
                        title="Preview"
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      ><Eye size={12} /></button>
                      <button
                        data-testid={`button-copy-script-${script.id}`}
                        onClick={() => copyScript(script)}
                        title="Copy"
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      ><Copy size={12} /></button>
                      <button
                        data-testid={`button-edit-script-${script.id}`}
                        onClick={() => setEditing(script)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      ><Pencil size={12} /></button>
                      <button
                        data-testid={`button-delete-script-${script.id}`}
                        onClick={() => { if (confirm("Delete this script?")) deleteMutation.mutate(script.id); }}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      ><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-xs capitalize ${TYPE_COLORS[script.type]}`}>
                      {script.type}
                    </Badge>
                    <Badge variant="outline" className={`text-xs badge-${script.category}`}>
                      {CATEGORY_LABELS[script.category]}
                    </Badge>
                    {seq && <Badge variant="outline" className="text-xs text-muted-foreground">{seq.name}</Badge>}
                  </div>
                  {script.subject && (
                    <p className="text-xs font-medium text-muted-foreground border-l-2 border-primary/30 pl-2 mt-1">
                      Subject: {script.subject}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  {/* Body Preview */}
                  <div className="text-xs bg-muted/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {renderWithMergeFields(script.body)}
                  </div>
                  {/* Merge Fields */}
                  {fields.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {fields.map(f => (
                        <span key={f} className="merge-field">[{f}]</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">
              No scripts found. Add one to get started.
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(creating || editing) && (
        <ScriptModal
          existing={editing}
          sequences={sequences}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {/* Preview Modal */}
      {previewing && (
        <ScriptPreviewModal script={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>
  );
}

function ScriptModal({
  existing, sequences, onClose
}: {
  existing: Script | null;
  sequences: Sequence[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!existing;

  const [form, setForm] = useState({
    name: existing?.name ?? "",
    type: existing?.type ?? "sms",
    subject: existing?.subject ?? "",
    body: existing?.body ?? "",
    category: existing?.category ?? "cold_lead",
    sequenceId: existing?.sequenceId ?? null as number | null,
  });

  const liveFields = useMemo(() => {
    const fields = new Set<string>();
    let m; const r = /\[([^\]]+)\]/g;
    while ((m = r.exec(form.body)) !== null) fields.add(m[1]);
    return Array.from(fields);
  }, [form.body]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiRequest("PATCH", `/api/scripts/${existing.id}`, data).then(r => r.json())
      : apiRequest("POST", "/api/scripts", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      toast({ title: isEdit ? "Script updated" : "Script created" });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      mergeFields: JSON.stringify(liveFields),
      sequenceId: form.sequenceId || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-base">{isEdit ? "Edit Script" : "New Script"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Script Name</label>
              <input
                data-testid="input-script-name"
                required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. Cold Lead Initial Text"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select
                data-testid="select-script-type"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="call">Call Script</option>
                <option value="voicemail">Voicemail</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select
                data-testid="select-script-category"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Link to Sequence (optional)</label>
              <select
                data-testid="select-script-sequence"
                value={form.sequenceId ?? ""}
                onChange={e => setForm(f => ({ ...f, sequenceId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">None</option>
                {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {form.type === "email" && (
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Email Subject</label>
                <input
                  data-testid="input-script-subject"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Quick update on [Area]"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Script Body — use <span className="merge-field">[Field Name]</span> for merge fields
              </label>
              <textarea
                data-testid="input-script-body"
                required value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none resize-none font-mono"
                rows={8}
                placeholder={'Hi [Name], this is [Your Name] checking on your home search in [Area]...'}
              />
              {liveFields.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Detected fields:</span>
                  {liveFields.map(f => <span key={f} className="merge-field">[{f}]</span>)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" data-testid="button-save-script"
              disabled={saveMutation.isPending}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saveMutation.isPending ? "Saving…" : isEdit ? "Update Script" : "Create Script"}
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

function ScriptPreviewModal({ script, onClose }: { script: Script; onClose: () => void }) {
  const fields = useMemo(() => {
    const f = new Set<string>();
    let m; const r = /\[([^\]]+)\]/g;
    while ((m = r.exec(script.body)) !== null) f.add(m[1]);
    if (script.subject) {
      const r2 = /\[([^\]]+)\]/g;
      while ((m = r2.exec(script.subject)) !== null) f.add(m[1]);
    }
    return Array.from(f);
  }, [script]);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [f, ""]))
  );

  function fill(text: string) {
    return text.replace(/\[([^\]]+)\]/g, (_, key) => values[key] || `[${key}]`);
  }

  const Icon = TYPE_ICONS[script.type] ?? MessageSquare;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Icon size={16} />
            <h2 className="font-bold text-base">Preview: {script.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Fill in merge fields */}
          {fields.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fill Merge Fields</p>
              <div className="grid grid-cols-2 gap-2">
                {fields.map(f => (
                  <div key={f}>
                    <label className="text-xs text-muted-foreground mb-0.5 block">[{f}]</label>
                    <input
                      value={values[f] || ""}
                      onChange={e => setValues(v => ({ ...v, [f]: e.target.value }))}
                      className="w-full border rounded-md px-2.5 py-1.5 text-sm bg-background focus:ring-2 focus:ring-primary outline-none"
                      placeholder={f}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Preview */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rendered Preview</p>
            {script.subject && (
              <div className="bg-muted/50 rounded-t-lg border-b px-4 py-2">
                <span className="text-xs text-muted-foreground font-medium">Subject: </span>
                <span className="text-sm font-medium">{fill(script.subject)}</span>
              </div>
            )}
            <div className="bg-muted/50 rounded-b-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
              {fill(script.body)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText((script.subject ? `Subject: ${fill(script.subject)}\n\n` : "") + fill(script.body)); }}
              className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Copy size={13} /> Copy Filled Script
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

