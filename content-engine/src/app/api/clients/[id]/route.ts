import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabase } from "@/lib/supabase/server"
import { createAdminSupabase } from "@/lib/supabase/admin"
import { isSupabaseAdminConfigured } from "@/lib/supabase/env"

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  niche: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["prospect", "research", "active", "delivered", "paused"]).optional(),
  notes: z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Admin not configured" }, { status: 500 })

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from("clients")
    .select(`*, research_profiles(*), wf_jobs(*)`)
    .eq("id", id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ client: data })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Admin not configured" }, { status: 500 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from("clients")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Admin not configured" }, { status: 500 })

  const admin = createAdminSupabase()
  const { error } = await admin.from("clients").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
