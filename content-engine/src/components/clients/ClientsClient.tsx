"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, ExternalLink, ChevronRight, Loader2, Building2, Globe } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input, Label } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ResearchProfile = {
  module_completed: number
  updated_at: string
}

type WFJob = {
  stage: number
  stage_name: string | null
  status: string
  vercel_url: string | null
  proposal_url: string | null
}

type Client = {
  id: string
  name: string
  niche: string | null
  slug: string | null
  email: string | null
  phone: string | null
  website: string | null
  location: string | null
  status: string
  notes: string | null
  created_at: string
  research_profiles: ResearchProfile[]
  wf_jobs: WFJob[]
}

const STATUS_COLORS: Record<string, string> = {
  prospect: "default",
  research: "accent",
  active: "info",
  delivered: "success",
  paused: "warning",
}

const WF_STAGES = [
  "Intake", "Research", "SEO", "Assets", "Strategy", "Copywriting",
  "Brand DNA", "Brand Resonance", "Hero Image", "Build", "Personalise",
  "Uplift", "QA", "Deploy",
]

export function ClientsClient({ userEmail }: { userEmail?: string | null }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", niche: "", email: "", location: "", website: "" })

  async function loadClients() {
    try {
      const res = await fetch("/api/clients")
      const json = await res.json()
      setClients(json.clients ?? [])
    } catch {
      toast.error("Failed to load clients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadClients() }, [])

  async function createClient(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to create client")
      const json = await res.json()
      setClients((prev) => [json.client, ...prev])
      setForm({ name: "", niche: "", email: "", location: "", website: "" })
      setShowForm(false)
      toast.success(`Client "${json.client.name}" created`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setCreating(false)
    }
  }

  const prospect = clients.filter((c) => c.status === "prospect").length
  const active = clients.filter((c) => c.status === "active" || c.status === "research").length
  const delivered = clients.filter((c) => c.status === "delivered").length

  return (
    <div className="flex h-screen flex-col bg-[color:var(--color-background)] text-[color:var(--color-foreground)]">
      <TopBar userEmail={userEmail} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="livo-wordmark text-display text-[color:var(--color-foreground)]">Clients</h1>
              <p className="mt-1 text-body text-[color:var(--color-secondary)]">
                Track every client from research through website delivery.
              </p>
            </div>
            <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
              <Plus className="h-4 w-4" />
              New client
            </Button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Prospects", value: prospect, tone: "muted" },
              { label: "In progress", value: active, tone: "accent" },
              { label: "Delivered", value: delivered, tone: "success" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 py-4"
              >
                <p className="text-caption uppercase tracking-[0.16em] text-[color:var(--color-muted)]">{s.label}</p>
                <p className="mt-1 text-display font-bold text-[color:var(--color-foreground)]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* New client form */}
          {showForm && (
            <form
              onSubmit={createClient}
              className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 space-y-4"
            >
              <h2 className="text-h2 font-semibold">New client</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Business name *</Label>
                  <Input
                    required
                    placeholder="e.g. Peak Roofing Co."
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Niche</Label>
                  <Input
                    placeholder="e.g. Residential Roofing"
                    value={form.niche}
                    onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. Phoenix, AZ"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="owner@business.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Current website</Label>
                  <Input
                    placeholder="https://..."
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  {creating ? "Creating..." : "Create client"}
                </Button>
              </div>
            </form>
          )}

          {/* Client list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-[color:var(--color-muted)]" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="mb-3 h-10 w-10 text-[color:var(--color-muted)]" />
              <p className="text-body text-[color:var(--color-secondary)]">No clients yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <ClientRow key={client.id} client={client} onUpdate={loadClients} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ClientRow({ client, onUpdate }: { client: Client; onUpdate: () => void }) {
  const research = client.research_profiles?.[0]
  const wfJob = client.wf_jobs?.[0]
  const researchProgress = research?.module_completed ?? 0
  const wfStage = wfJob?.stage ?? 0

  return (
    <div className="group rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 py-4 transition-colors hover:border-[color:var(--color-border-strong)]">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
          <Building2 className="h-5 w-5" />
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[color:var(--color-foreground)] truncate">{client.name}</span>
            <Badge tone={STATUS_COLORS[client.status] as any ?? "default"}>
              {client.status}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-caption text-[color:var(--color-muted)]">
            {client.niche && <span>{client.niche}</span>}
            {client.location && <span>·</span>}
            {client.location && <span>{client.location}</span>}
          </div>
        </div>

        {/* Research progress */}
        <div className="hidden sm:flex flex-col items-center gap-1 min-w-[90px]">
          <span className="text-caption text-[color:var(--color-muted)]">Research</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 w-3 rounded-full",
                  i < researchProgress
                    ? "bg-[color:var(--color-accent)]"
                    : "bg-[color:var(--color-border-strong)]"
                )}
              />
            ))}
          </div>
          <span className="text-caption text-[color:var(--color-secondary)]">{researchProgress}/7</span>
        </div>

        {/* WF Pipeline progress */}
        <div className="hidden md:flex flex-col items-center gap-1 min-w-[120px]">
          <span className="text-caption text-[color:var(--color-muted)]">Website Factory</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 13 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 w-2 rounded-full",
                  i < wfStage
                    ? "bg-[color:var(--color-success)]"
                    : "bg-[color:var(--color-border-strong)]"
                )}
                title={WF_STAGES[i]}
              />
            ))}
          </div>
          <span className="text-caption text-[color:var(--color-secondary)]">
            {wfStage === 0 ? "Not started" : wfJob?.stage_name ?? `Stage ${wfStage}`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {wfJob?.vercel_url && (
            <a
              href={wfJob.vercel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-caption text-[color:var(--color-secondary)] hover:text-[color:var(--color-foreground)] transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Live site</span>
            </a>
          )}
          <Link href={`/clients/${client.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
