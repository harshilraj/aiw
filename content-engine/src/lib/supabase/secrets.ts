import { createAdminSupabase } from "./admin"
import { isSupabaseAdminConfigured } from "./env"

/**
 * The paid-service keys stored in app_settings.secrets (jsonb) or env vars.
 * openai_api_key replaces anthropic_api_key as the primary AI key.
 */
export type SecretName =
  | "openai_api_key"
  | "anthropic_api_key"   // kept for backward compatibility — not used by the AI layer
  | "apify_api_token"
  | "assemblyai_api_key"

const ENV_FALLBACK: Record<SecretName, string> = {
  openai_api_key: "OPENAI_API_KEY",
  anthropic_api_key: "ANTHROPIC_API_KEY",
  apify_api_token: "APIFY_API_TOKEN",
  assemblyai_api_key: "ASSEMBLYAI_API_KEY",
}

/**
 * Resolution order:
 *   1. process.env (fastest, takes precedence in dev)
 *   2. app_settings.secrets in Supabase (set via setup wizard)
 *   3. null — caller falls back to stub mode
 */
export async function getSecret(name: SecretName): Promise<string | null> {
  const envName = ENV_FALLBACK[name]
  const fromEnv = process.env[envName]
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim()

  if (!isSupabaseAdminConfigured()) return null

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from("app_settings")
    .select("secrets")
    .eq("id", 1)
    .single()

  if (error || !data) return null
  const secrets = (data.secrets ?? {}) as Record<string, unknown>
  const value = secrets[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export async function getAllSecretsStatus(): Promise<
  Record<SecretName, { configured: boolean; source: "env" | "db" | null }>
> {
  const names: SecretName[] = [
    "openai_api_key",
    "apify_api_token",
    "assemblyai_api_key",
  ]
  const out = {} as Record<SecretName, { configured: boolean; source: "env" | "db" | null }>

  for (const n of names) {
    if (process.env[ENV_FALLBACK[n]]) {
      out[n] = { configured: true, source: "env" }
      continue
    }
    const v = await getSecret(n)
    out[n] = { configured: Boolean(v), source: v ? "db" : null }
  }
  return out
}

export async function setSecret(
  name: SecretName,
  value: string | null
): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin not configured. Cannot persist secrets.")
  }
  const admin = createAdminSupabase()
  const { data: existing } = await admin
    .from("app_settings")
    .select("secrets")
    .eq("id", 1)
    .single()

  const current = (existing?.secrets ?? {}) as Record<string, unknown>
  const next = { ...current }
  if (value === null) delete next[name]
  else next[name] = value

  const { error } = await admin
    .from("app_settings")
    .update({ secrets: next })
    .eq("id", 1)

  if (error) throw error
}
