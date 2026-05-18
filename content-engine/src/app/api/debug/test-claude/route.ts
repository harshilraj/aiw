import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createServerSupabase } from "@/lib/supabase/server"
import { getSecret } from "@/lib/supabase/secrets"

export const maxDuration = 30

/**
 * OpenAI smoke test. Hits the API with each model identifier used in production
 * and returns whether it responds. Surfaces exact error messages so silent
 * stub fallbacks can be diagnosed.
 */
const MODELS_TO_TEST = [
  "gpt-4o",
  "gpt-4o-mini",
] as const

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const key = await getSecret("openai_api_key")
  if (!key) {
    return NextResponse.json({
      ok: false,
      reason: "openai_api_key not found in env or app_settings.secrets",
    })
  }

  const client = new OpenAI({ apiKey: key })
  const results: Record<string, { ok: boolean; error?: string; reply?: string }> = {}

  for (const model of MODELS_TO_TEST) {
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: 16,
        messages: [{ role: "user", content: "say hi" }],
      })
      const text = response.choices[0]?.message?.content ?? ""
      results[model] = { ok: true, reply: text.slice(0, 100) }
    } catch (e) {
      results[model] = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }

  return NextResponse.json({
    key_length: key.length,
    key_prefix: key.slice(0, 10) + "...",
    results,
  })
}
