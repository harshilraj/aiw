import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { ResearchClient } from "@/components/research/ResearchClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Livo — Research" }

export default async function ResearchPage() {
  if (!isSupabaseConfigured()) redirect("/")

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/research")

  return <ResearchClient userEmail={user.email} />
}
