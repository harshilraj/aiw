import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"
import { createServerSupabase } from "@/lib/supabase/server"
import { createAdminSupabase } from "@/lib/supabase/admin"
import { isSupabaseAdminConfigured } from "@/lib/supabase/env"
import { getSecret } from "@/lib/supabase/secrets"

export const maxDuration = 60

const runSchema = z.object({
  client_id: z.string().uuid(),
  module: z.number().int().min(1).max(7),
  input: z.record(z.string(), z.unknown()), // form data for that module
})

// ─────────────────────────────────────────────────────────
// System prompts per module (condensed but complete)
// ─────────────────────────────────────────────────────────

const MODULE_PROMPTS: Record<number, { system: string; outputKey: string }> = {
  1: {
    outputKey: "student_profile",
    system: `You are a niche-discovery interviewer. Based on the answers provided, produce a complete Student Profile with these sections:
- Lived industries (inside knowledge) — list each with how they know it and years
- Hard skills (proven, not aspirational)
- Soft assets (network, trusted communities, reputation)
- Pattern recognition (where they see opportunities)
- Filters (will/won't work with, geographic lean)
- Resources (time/week, capital, skill self-scores: design/sales/SEO/content each /5)
- 12-month target
- Raw niche candidates surfaced (at least 5)

Output a structured JSON object matching this shape:
{
  "lived_industries": [{"industry": "", "how_they_know_it": "", "years": 0}],
  "hard_skills": [{"skill": "", "evidence": ""}],
  "network_in": [],
  "trusted_communities": [],
  "reputation_portfolio": "",
  "pattern_recognition": [{"area": "", "insight": ""}],
  "will_work_with": [],
  "wont_work_with": [],
  "geographic_lean": "",
  "time_per_week_hrs": 0,
  "capital_usd": 0,
  "skill_scores": {"design": 0, "sales": 0, "seo": 0, "content": 0},
  "target_12mo": "",
  "niche_candidates": [{"niche": "", "why_it_came_up": ""}]
}
Return only the JSON, no markdown wrapper.`,
  },
  2: {
    outputKey: "niche_decision",
    system: `You are a niche scoring analyst. Given the student profile and 5 niche candidates, score each niche on 7 factors (1-5 each):
existing_experience, ticket_size, industry_size, recession_proof, standardized_blueprint, regulation_drag, network_fit.

Pick the TOP niche. Output JSON:
{
  "scored_niches": [{"niche": "", "scores": {"existing_experience":0,"ticket_size":0,"industry_size":0,"recession_proof":0,"standardized_blueprint":0,"regulation_drag":0,"network_fit":0}, "total": 0, "notes": ""}],
  "chosen_niche": "",
  "why_chosen": [],
  "customer_researches_before_buying": true,
  "avg_ticket_usd": 0,
  "hangs_out_at": [],
  "roi_math": "",
  "five_prospects": [{"name": "", "why": ""}]
}
Return only the JSON.`,
  },
  3: {
    outputKey: "offer_pack",
    system: `You are an offer strategist. Based on the student profile and chosen niche, produce the full Offer Pack:

{
  "positioning_sentence": "I help [niche] win the trust of [end customer] who is [decision moment] so they choose [niche owner] over the competition.",
  "public_one_liner": "I build high-converting websites for [niche]",
  "stage_of_business": "no_portfolio|some|portfolio|established",
  "risk_reversal": "",
  "price_anchor": {"entry": 0, "core": 0, "premium": 0},
  "payment_terms": "",
  "cold_dm_short": "",
  "cold_dm_medium": "",
  "cold_dm_long": "",
  "first_5_prospects": [{"name": "", "platform": "", "personalization_angle": ""}]
}
Return only the JSON.`,
  },
  4: {
    outputKey: null, // internal confirmation step — no DB write
    system: `Internal step. Confirm you understand the Website Factory's intake spec. The factory:
- Takes a client name, niche, positioning sentence, trust element priority, SEO keywords, CTAs, assets list
- Produces a deployed Vite+React website with 13 fixed sections
- Overlays brand-dna.js (palette, typography, copy) onto a locked template
Output a brief confirmation (3-4 sentences) then say "Ready for Module 5."`,
  },
  5: {
    outputKey: "wf_brief",
    system: `You are producing a Website Factory Brief. Using the student profile, niche decision, and offer pack, fill this exact JSON. This JSON will be downloaded and used as intake for the Website Factory Claude Code pipeline.

{
  "metadata": {"submitted_by": "", "project_type": "new_build", "target_launch": "TBD"},
  "client": {"business_name": "", "niche": "", "locations": [], "decision_maker": "", "current_website": "", "doing_well": [], "missing": []},
  "strategy": {
    "positioning_sentence": "",
    "end_customer": {"profile": "", "decision_moment": "", "fears": [], "researches_at": []},
    "competitor_summary": {"what_works": [], "opportunity": []}
  },
  "niche_decisions": {
    "trust_elements_priority": [],
    "trust_assets_to_gather": [],
    "primary_keywords": [],
    "secondary_keywords": [],
    "service_area_pages": [],
    "service_pages": [],
    "gbp_optimization": true,
    "primary_cta": "",
    "secondary_cta": "",
    "form_fields": [],
    "friction_to_avoid": []
  },
  "proof_assets": {"case_studies": [], "testimonials": [], "portfolio_urls": [], "press": []},
  "operator_notes": {"stage_of_business": "", "pricing": "", "risk_reversal": "", "special_promises": [], "do_not": []},
  "missing_flags": []
}
Return only the JSON.`,
  },
  6: {
    outputKey: null, // internal step
    system: `Internal step. Confirm you understand the Content Engine's intake spec:
- Takes niche, ICP, voice profile, content pillars, keywords
- Produces Instagram reels, carousels, long-form scripts in the operator's voice
- Scripts are pushed to the Pipeline kanban and tracked through to published
Output a brief confirmation then say "Ready for Module 7."`,
  },
  7: {
    outputKey: "ce_brief",
    system: `You are producing a Content Engine Brief. This JSON auto-loads into the Content Engine's context buckets.

{
  "operator": {"name": "", "lived_experience": [], "origin_story": "", "voice": {"register": "casual|professional|technical|blunt|warm", "natural_phrases": [], "never_say": []}},
  "who_we_serve": {
    "niche": "",
    "icp": {"business_type": "", "size": "", "stage_signals": [], "hangs_out_at": [], "decision_makers": []},
    "end_customer": {"demographics": "", "decision_moment": "", "fears": [], "researches_at": []}
  },
  "offer": {"positioning_sentence": "", "public_one_liner": "", "what_we_deliver": "", "pricing": "", "risk_reversal": ""},
  "proof": {"case_studies": [], "testimonials": [], "portfolio": [], "founder_brand_assets": []},
  "content_pillars": [
    {"name": "Trust-building", "topics": [], "sample_hooks": []},
    {"name": "Industry education", "topics": [], "sample_hooks": []},
    {"name": "Behind-the-scenes", "topics": [], "sample_hooks": []},
    {"name": "Niche pain points", "topics": [], "sample_hooks": []}
  ],
  "keywords": {"primary": [], "secondary": [], "geographic": []},
  "cadence": {"posts_per_week": 5, "channels": ["instagram", "tiktok"], "repurposing": ""},
  "banned_topics": [],
  "missing_flags": []
}
Return only the JSON.`,
  },
}

async function runModule(
  module: number,
  input: Record<string, unknown>,
  previousOutputs: Record<string, unknown>
): Promise<{ raw: string; parsed: unknown }> {
  const key = await getSecret("openai_api_key")
  if (!key) throw new Error("OpenAI API key not configured")

  const client = new OpenAI({ apiKey: key })
  const prompt = MODULE_PROMPTS[module]

  const userContent = `
Context from previous modules:
${JSON.stringify(previousOutputs, null, 2)}

Current module input:
${JSON.stringify(input, null, 2)}

${module === 1 ? "Produce the Student Profile JSON based on the interview answers above." : ""}
${module === 2 ? "Score the niche candidates and pick the winner." : ""}
${module === 3 ? "Produce the Offer Pack JSON." : ""}
${module === 5 ? "Produce the Website Factory Brief JSON." : ""}
${module === 7 ? "Produce the Content Engine Brief JSON." : ""}
${module === 4 || module === 6 ? "Confirm you understand the downstream system structure." : ""}
`.trim()

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: userContent },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? ""

  // Try to parse JSON from the response
  let parsed: unknown = raw
  if (prompt.outputKey) {
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = { _raw: raw, _parse_error: "Could not parse JSON" }
    }
  }

  return { raw, parsed }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 })
  }

  const body = await req.json()
  const parsed = runSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { client_id, module, input } = parsed.data
  const admin = createAdminSupabase()

  // Load existing research profile
  const { data: profile } = await admin
    .from("research_profiles")
    .select("*")
    .eq("client_id", client_id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "Research profile not found" }, { status: 404 })
  }

  // Build context from previous module outputs
  const previousOutputs: Record<string, unknown> = {
    student_profile: profile.student_profile,
    niche_decision: profile.niche_decision,
    offer_pack: profile.offer_pack,
    wf_brief: profile.wf_brief,
    ce_brief: profile.ce_brief,
  }

  try {
    const { raw, parsed: moduleOutput } = await runModule(module, input, previousOutputs)

    // Build DB update
    const promptConfig = MODULE_PROMPTS[module]
    const updatePayload: Record<string, unknown> = {
      module_completed: Math.max(profile.module_completed ?? 0, module),
      raw_outputs: {
        ...(profile.raw_outputs as Record<string, unknown> ?? {}),
        [`module_${module}`]: raw,
      },
    }

    if (promptConfig.outputKey) {
      updatePayload[promptConfig.outputKey] = moduleOutput
    }

    // Module 7 completion: auto-create context_items in Content Engine
    if (module === 7 && promptConfig.outputKey) {
      const ceBrief = moduleOutput as Record<string, unknown>
      await seedContextFromCEBrief(admin, client_id, ceBrief)
      // Mark client as research-complete
      await admin.from("clients").update({ status: "active" }).eq("id", client_id)
    }

    const { error: updateError } = await admin
      .from("research_profiles")
      .update(updatePayload)
      .eq("client_id", client_id)

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      module,
      output: moduleOutput,
      module_completed: updatePayload.module_completed,
    })
  } catch (e) {
    console.error("[research/run] error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Module run failed" },
      { status: 500 }
    )
  }
}

// Auto-seed Content Engine context buckets from a completed CE Brief
async function seedContextFromCEBrief(
  admin: ReturnType<typeof createAdminSupabase>,
  clientId: string,
  brief: Record<string, unknown>
) {
  const items: { title: string; raw_content: string; bucket: string; source_type: string }[] = []

  const offer = brief.offer as Record<string, unknown> | undefined
  const serve = brief.who_we_serve as Record<string, unknown> | undefined
  const pillars = brief.content_pillars as Array<Record<string, unknown>> | undefined
  const operator = brief.operator as Record<string, unknown> | undefined
  const voice = operator?.voice as Record<string, unknown> | undefined

  if (offer) {
    items.push({
      title: "Business Positioning",
      bucket: "context",
      source_type: "text",
      raw_content: `Positioning: ${offer.positioning_sentence}\nOffer: ${offer.what_we_deliver}\nPricing: ${offer.pricing}\nRisk reversal: ${offer.risk_reversal}`,
    })
  }

  if (serve) {
    const icp = serve.icp as Record<string, unknown> | undefined
    const endCustomer = serve.end_customer as Record<string, unknown> | undefined
    items.push({
      title: "Ideal Client + Target Customer",
      bucket: "context",
      source_type: "text",
      raw_content: `Niche: ${serve.niche}\nICP: ${JSON.stringify(icp)}\nEnd Customer: ${JSON.stringify(endCustomer)}`,
    })
  }

  if (voice) {
    items.push({
      title: "Voice & Tone Profile",
      bucket: "my_voice",
      source_type: "text",
      raw_content: `Register: ${voice.register}\nNatural phrases: ${(voice.natural_phrases as string[])?.join(", ")}\nNever say: ${(voice.never_say as string[])?.join(", ")}`,
    })
  }

  if (pillars && Array.isArray(pillars)) {
    for (const pillar of pillars) {
      const hooks = pillar.sample_hooks as string[] | undefined
      const topics = pillar.topics as string[] | undefined
      items.push({
        title: `Content Pillar: ${pillar.name}`,
        bucket: "video_ideas",
        source_type: "text",
        raw_content: `Topics: ${topics?.join(", ")}\n\nHook ideas:\n${hooks?.join("\n")}`,
      })
    }
  }

  if (items.length === 0) return

  await admin.from("context_items").insert(
    items.map((item) => ({
      title: item.title,
      raw_content: item.raw_content,
      bucket: item.bucket,
      source_type: item.source_type,
      status: "processed",
      processed_content: item.raw_content,
      tags: ["ce-brief", `client:${clientId}`],
    }))
  )
}
