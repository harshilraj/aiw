import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabase } from "@/lib/supabase/server"
import { createAdminSupabase } from "@/lib/supabase/admin"
import { isSupabaseAdminConfigured } from "@/lib/supabase/env"

const createSchema = z.object({
  name: z.string().min(1),
  niche: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 })
  }

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from("clients")
    .select(`
      *,
      research_profiles(module_completed, updated_at),
      wf_jobs(stage, stage_name, status, vercel_url, proposal_url)
    `)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const admin = createAdminSupabase()

  // Generate slug from name
  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36)

  const { data: client, error } = await admin
    .from("clients")
    .insert({
      name: parsed.data.name,
      niche: parsed.data.niche || null,
      slug,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
      status: "prospect",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create empty research_profile and wf_job rows
  await admin.from("research_profiles").insert({ client_id: client.id })
  await admin.from("wf_jobs").insert({ client_id: client.id })

  return NextResponse.json({ client }, { status: 201 })
}
