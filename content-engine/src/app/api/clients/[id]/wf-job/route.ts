import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabase } from "@/lib/supabase/server"
import { createAdminSupabase } from "@/lib/supabase/admin"
import { isSupabaseAdminConfigured } from "@/lib/supabase/env"

const patchSchema = z.object({
  stage: z.number().int().min(0).max(13).optional(),
  stage_name: z.string().optional(),
  status: z.enum(["pending", "running", "waiting_approval", "done", "failed"]).optional(),
  vercel_url: z.string().url().optional().or(z.literal("")),
  proposal_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
})

type Params = { params: Promise<{ client_id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { client_id } = await params
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Admin not configured" }, { status: 500 })

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from("wf_jobs")
    .select("*")
    .eq("client_id", client_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ job: data })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { client_id } = await params
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Admin not configured" }, { status: 500 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const admin = createAdminSupabase()

  // Auto-set timestamps
  const update: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status === "running" && !update.started_at) {
    update.started_at = new Date().toISOString()
  }
  if (parsed.data.status === "done") {
    update.completed_at = new Date().toISOString()
    // Also mark client as delivered
    await admin.from("clients").update({ status: "delivered" }).eq("id", client_id)
  }

  const { data, error } = await admin
    .from("wf_jobs")
    .update(update)
    .eq("client_id", client_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ job: data })
}
