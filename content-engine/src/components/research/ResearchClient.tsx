"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Loader2, Download, CheckCircle2, Circle, ChevronDown, ChevronRight, Sparkles, Zap } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Input, Label, Textarea } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Client = { id: string; name: string; niche: string | null; status: string }
type ResearchProfile = {
  module_completed: number
  student_profile: unknown
  niche_decision: unknown
  offer_pack: unknown
  wf_brief: unknown
  ce_brief: unknown
}

const MODULES = [
  { id: 1, name: "Discovery Interview", subtitle: "Background, industries, network, skills", icon: "👤" },
  { id: 2, name: "Niche Scoring", subtitle: "Score & select the winning niche", icon: "🎯" },
  { id: 3, name: "Offer Crafting", subtitle: "Positioning, pricing, cold DMs", icon: "💼" },
  { id: 4, name: "WF Structure Load", subtitle: "Confirm Website Factory intake spec (internal)", icon: "🏗️", internal: true },
  { id: 5, name: "WF Brief", subtitle: "Generate Website Factory intake brief", icon: "📋" },
  { id: 6, name: "CE Structure Load", subtitle: "Confirm Content Engine intake spec (internal)", icon: "⚙️", internal: true },
  { id: 7, name: "CE Brief", subtitle: "Generate Content Engine brief + auto-load context", icon: "✨" },
]

// Per-module input forms
const MODULE_INPUTS: Record<number, { label: string; key: string; type?: "textarea" | "text"; placeholder?: string }[]> = {
  1: [
    { label: "Operator name", key: "name", placeholder: "Your name" },
    { label: "Work history (last 5-10 years)", key: "work_history", type: "textarea", placeholder: "Walk through your career..." },
    { label: "Industries you know from the inside", key: "industries", type: "textarea", placeholder: "Which industries have you worked in, lived in, or are deeply familiar with?" },
    { label: "Hard skills you've proven", key: "hard_skills", type: "textarea", placeholder: "Skills you've used professionally, not just learned" },
    { label: "Your network (who do you actually know?)", key: "network", type: "textarea", placeholder: "Business owners, decision-makers, industry insiders" },
    { label: "Where have you seen businesses leaving money on the table?", key: "opportunities", type: "textarea", placeholder: "Bad websites, bad marketing, missed conversions..." },
    { label: "What kind of client would you enjoy working with weekly?", key: "client_filter", type: "textarea", placeholder: "Personality, industry, size..." },
    { label: "Time/week available, capital available, and 12-month goal", key: "resources", type: "textarea", placeholder: "e.g. 20 hrs/week, $500 capital, goal: $5k/month in 12 months" },
  ],
  2: [
    { label: "Paste your Student Profile (from Module 1 output)", key: "student_profile_text", type: "textarea", placeholder: "Paste the Module 1 output here, or leave blank to use saved data" },
    { label: "Additional niche candidates to consider (optional)", key: "extra_candidates", type: "textarea", placeholder: "Any niches you're excited about that might not have come up yet?" },
    { label: "Any industry you absolutely refuse to work in?", key: "dealbreakers", type: "textarea", placeholder: "e.g. MLM, casinos, politics..." },
  ],
  3: [
    { label: "Client business name (if for a specific client)", key: "client_name", placeholder: "Leave blank if building your own agency offer" },
    { label: "Any specific pricing constraints or existing promises?", key: "pricing_notes", type: "textarea", placeholder: "e.g. already quoted $3k, client has $5k budget..." },
    { label: "Stage of business (no portfolio / some / portfolio / established)", key: "stage", placeholder: "e.g. some — have 2 free projects done" },
  ],
  4: [{ label: "Notes (optional)", key: "notes", placeholder: "Any specific WF config notes" }],
  5: [
    { label: "Client business name", key: "client_name", placeholder: "The actual business you're building for" },
    { label: "Client location(s)", key: "locations", placeholder: "City, State" },
    { label: "Client's current website URL (if any)", key: "current_website", placeholder: "https://..." },
    { label: "What the client is already doing well", key: "doing_well", type: "textarea", placeholder: "Strong reviews, good photos, loyal customers..." },
    { label: "What's missing / the opportunity", key: "missing", type: "textarea", placeholder: "No trust signals above fold, no before/after gallery..." },
    { label: "Operator notes (pricing, promises made, special constraints)", key: "operator_notes", type: "textarea", placeholder: "Agreed on $4k, free mock-up was shown, no competitor names in copy..." },
  ],
  6: [{ label: "Notes (optional)", key: "notes", placeholder: "Any CE config notes" }],
  7: [
    { label: "Additional voice/tone notes", key: "voice_notes", type: "textarea", placeholder: "Anything specific about how you communicate that Module 1 didn't capture..." },
    { label: "Content cadence (posts/week, channels)", key: "cadence", placeholder: "e.g. 5 posts/week, Instagram + TikTok" },
    { label: "Banned topics or off-limits content", key: "banned", type: "textarea", placeholder: "Topics to never post about..." },
  ],
}

export function ResearchClient({ userEmail }: { userEmail?: string | null }) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [profile, setProfile] = useState<ResearchProfile | null>(null)
  const [activeModule, setActiveModule] = useState<number>(1)
  const [moduleInputs, setModuleInputs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [moduleOutput, setModuleOutput] = useState<Record<number, unknown>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Load clients for selector
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => setClients(j.clients ?? []))
      .catch(() => {})
  }, [])

  const loadProfile = useCallback(async (clientId: string) => {
    setLoadingProfile(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      const json = await res.json()
      const rp = json.client?.research_profiles?.[0] ?? null
      setProfile(rp)
      if (rp) {
        // Pre-fill module outputs from saved data
        const saved: Record<number, unknown> = {}
        if (rp.student_profile) saved[1] = rp.student_profile
        if (rp.niche_decision) saved[2] = rp.niche_decision
        if (rp.offer_pack) saved[3] = rp.offer_pack
        if (rp.wf_brief) saved[5] = rp.wf_brief
        if (rp.ce_brief) saved[7] = rp.ce_brief
        setModuleOutput(saved)
        // Jump to next incomplete module
        const next = (rp.module_completed ?? 0) + 1
        setActiveModule(Math.min(next, 7))
      }
    } catch {
      toast.error("Failed to load research profile")
    } finally {
      setLoadingProfile(false)
    }
  }, [])

  useEffect(() => {
    if (selectedClientId) loadProfile(selectedClientId)
  }, [selectedClientId, loadProfile])

  async function runModule(moduleId: number) {
    if (!selectedClientId) {
      toast.error("Select a client first")
      return
    }
    setRunning(true)
    try {
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClientId,
          module: moduleId,
          input: moduleInputs,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Module run failed")
      }
      const json = await res.json()
      setModuleOutput((prev) => ({ ...prev, [moduleId]: json.output }))
      setExpanded((prev) => ({ ...prev, [moduleId]: true }))
      setProfile((prev) => prev ? { ...prev, module_completed: json.module_completed } : prev)
      setModuleInputs({})

      if (moduleId === 7) {
        toast.success("Module 7 complete! Context auto-loaded into Content Engine.", { duration: 5000 })
      } else {
        toast.success(`Module ${moduleId} complete`)
      }

      // Auto-advance to next module
      if (moduleId < 7) setActiveModule(moduleId + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setRunning(false)
    }
  }

  function downloadBrief(moduleId: number, filename: string) {
    const data = moduleOutput[moduleId]
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const completedModules = profile?.module_completed ?? 0

  return (
    <div className="flex h-screen flex-col bg-[color:var(--color-background)] text-[color:var(--color-foreground)]">
      <TopBar userEmail={userEmail} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — module stepper */}
        <aside className="hidden w-64 shrink-0 border-r border-[color:var(--color-border)] overflow-y-auto lg:flex flex-col">
          <div className="p-4 border-b border-[color:var(--color-border)]">
            <p className="text-caption uppercase tracking-[0.16em] text-[color:var(--color-muted)]">Research Wizard</p>
            <p className="mt-1 text-label text-[color:var(--color-secondary)]">
              {completedModules}/7 modules complete
            </p>
            {/* progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-[color:var(--color-border-strong)]">
              <div
                className="h-full rounded-full bg-[color:var(--color-accent)] transition-all duration-500"
                style={{ width: `${(completedModules / 7) * 100}%` }}
              />
            </div>
          </div>

          <nav className="flex-1 p-2 space-y-0.5">
            {MODULES.map((m) => {
              const done = completedModules >= m.id
              const active = activeModule === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  className={cn(
                    "w-full flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-foreground)]"
                      : "hover:bg-[color:var(--color-surface)] text-[color:var(--color-secondary)]"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {done
                      ? <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
                      : <Circle className="h-4 w-4 text-[color:var(--color-muted)]" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="text-label font-medium leading-tight truncate">
                      {m.id}. {m.name}
                    </div>
                    <div className="mt-0.5 text-caption text-[color:var(--color-muted)] leading-tight truncate">
                      {m.subtitle}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Client selector */}
          <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-6 py-3 flex items-center gap-4">
            <Label className="shrink-0 text-label text-[color:var(--color-muted)]">Client</Label>
            <select
              className="flex-1 max-w-xs rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-label text-[color:var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">— Select a client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.niche ? ` (${c.niche})` : ""}</option>
              ))}
            </select>
            {loadingProfile && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--color-muted)]" />}
            {!selectedClientId && (
              <span className="text-caption text-[color:var(--color-muted)]">
                Or{" "}
                <a href="/clients" className="underline hover:text-[color:var(--color-foreground)]">
                  create a client first
                </a>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
            {!selectedClientId ? (
              <EmptySelect />
            ) : (
              <>
                {MODULES.map((m) => (
                  <ModuleCard
                    key={m.id}
                    module={m}
                    isActive={activeModule === m.id}
                    isComplete={completedModules >= m.id}
                    output={moduleOutput[m.id]}
                    expanded={expanded[m.id] ?? false}
                    running={running && activeModule === m.id}
                    inputs={MODULE_INPUTS[m.id] ?? []}
                    inputValues={activeModule === m.id ? moduleInputs : {}}
                    onInputChange={(key, val) => setModuleInputs((prev) => ({ ...prev, [key]: val }))}
                    onRun={() => runModule(m.id)}
                    onToggleExpand={() => setExpanded((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                    onDownloadWF={m.id === 5 ? () => downloadBrief(5, `wf-brief-${selectedClientId}.json`) : undefined}
                    onDownloadCE={m.id === 7 ? () => downloadBrief(7, `ce-brief-${selectedClientId}.json`) : undefined}
                    onSelect={() => setActiveModule(m.id)}
                  />
                ))}

                {completedModules === 7 && (
                  <div className="rounded-2xl border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/5 p-6 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-[color:var(--color-success)]" />
                    <h3 className="text-h2 font-semibold text-[color:var(--color-foreground)]">Research complete</h3>
                    <p className="mt-2 text-body text-[color:var(--color-secondary)]">
                      WF Brief is ready to download. CE Brief has been auto-loaded into the Content Engine.
                      Download the WF Brief JSON and drop it into your{" "}
                      <code className="text-[color:var(--color-accent)]">website-factory/</code> Claude Code session.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <Button onClick={() => downloadBrief(5, `wf-brief-${selectedClientId}.json`)} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        WF Brief JSON
                      </Button>
                      <Button asChild>
                        <a href="/">Open Content Engine →</a>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function ModuleCard({
  module, isActive, isComplete, output, expanded, running,
  inputs, inputValues, onInputChange, onRun, onToggleExpand,
  onDownloadWF, onDownloadCE, onSelect,
}: {
  module: typeof MODULES[0]
  isActive: boolean
  isComplete: boolean
  output: unknown
  expanded: boolean
  running: boolean
  inputs: { label: string; key: string; type?: "textarea" | "text"; placeholder?: string }[]
  inputValues: Record<string, string>
  onInputChange: (key: string, val: string) => void
  onRun: () => void
  onToggleExpand: () => void
  onDownloadWF?: () => void
  onDownloadCE?: () => void
  onSelect: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-colors",
        isActive
          ? "border-[color:var(--color-accent)]/40 bg-[color:var(--color-surface)]"
          : isComplete
          ? "border-[color:var(--color-success)]/20 bg-[color:var(--color-surface)]/50"
          : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]/30"
      )}
    >
      {/* Header */}
      <button
        onClick={isComplete ? onToggleExpand : onSelect}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className="text-xl">{module.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-caption text-[color:var(--color-muted)]">Module {module.id}</span>
            {module.internal && (
              <span className="text-caption text-[color:var(--color-muted)] italic">(internal)</span>
            )}
          </div>
          <div className="font-semibold text-[color:var(--color-foreground)]">{module.name}</div>
          <div className="text-caption text-[color:var(--color-muted)]">{module.subtitle}</div>
        </div>
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-[color:var(--color-success)] shrink-0" />
        ) : isActive ? (
          <ChevronDown className="h-4 w-4 text-[color:var(--color-muted)] shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[color:var(--color-muted)] shrink-0" />
        )}
      </button>

      {/* Input form — shown when active */}
      {isActive && (
        <div className="border-t border-[color:var(--color-border)] px-5 pb-5 pt-4 space-y-4">
          {inputs.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  rows={3}
                  placeholder={field.placeholder}
                  value={inputValues[field.key] ?? ""}
                  onChange={(e) => onInputChange(field.key, e.target.value)}
                />
              ) : (
                <Input
                  placeholder={field.placeholder}
                  value={inputValues[field.key] ?? ""}
                  onChange={(e) => onInputChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={onRun} disabled={running} className="gap-2">
              {running
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : module.id === 7
                ? <Sparkles className="h-3.5 w-3.5" />
                : <Zap className="h-3.5 w-3.5" />
              }
              {running ? "Running..." : `Run Module ${module.id}`}
            </Button>
            <span className="text-caption text-[color:var(--color-muted)]">
              {module.id === 7 ? "Auto-loads context into Content Engine" : "Uses GPT-4o"}
            </span>
          </div>
        </div>
      )}

      {/* Output — shown when complete and expanded */}
      {isComplete && expanded && !!output && (
        <div className="border-t border-[color:var(--color-border)] px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-caption uppercase tracking-[0.16em] text-[color:var(--color-muted)]">Output</span>
            <div className="flex gap-2">
              {onDownloadWF && (
                <Button variant="outline" size="sm" onClick={onDownloadWF} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  WF Brief JSON
                </Button>
              )}
              {onDownloadCE && (
                <Button variant="outline" size="sm" onClick={onDownloadCE} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  CE Brief JSON
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onRun} disabled={running}>
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Regenerate"}
              </Button>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-[color:var(--color-background)] p-4 text-caption text-[color:var(--color-secondary)] max-h-96 overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function EmptySelect() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent-soft)]">
        <Sparkles className="h-7 w-7 text-[color:var(--color-accent)]" />
      </div>
      <h3 className="text-h1 font-semibold text-[color:var(--color-foreground)]">Research Wizard</h3>
      <p className="mt-2 max-w-sm text-body text-[color:var(--color-secondary)]">
        Select a client above to run the 7-module research workflow — from niche selection through
        Website Factory and Content Engine briefs.
      </p>
      <a href="/clients">
        <Button className="mt-5">Create or select a client →</Button>
      </a>
    </div>
  )
}
