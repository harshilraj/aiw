import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { ClientsClient } from "@/components/clients/ClientsClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Livo — Clients" }

export default async function ClientsPage() {
  if (!isSupabaseConfigured()) redirect("/")

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/clients")

  return <ClientsClient userEmail={user.email} />
}
