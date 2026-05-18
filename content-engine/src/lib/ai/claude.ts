import OpenAI from "openai"
import { getSecret } from "@/lib/supabase/secrets"
import {
  buildExpertFrameworkExtractionUserPrompt,
  buildGeneratorUserPrompt,
  buildIdeationUserPrompt,
  buildInspirationAnalysisUserPrompt,
  buildPostMortemUserPrompt,
  buildProposeExpertBrainUserPrompt,
  buildProposeNicheUserPrompt,
  buildProposeRadarSeedUserPrompt,
  buildRadarSuggestionUserPrompt,
  buildSummariseUserPrompt,
  buildVoiceSignatureExtractionUserPrompt,
  EXPERT_FRAMEWORK_EXTRACTION_SYSTEM_PROMPT,
  IDEATION_SYSTEM_PROMPT,
  INSPIRATION_ANALYSIS_SYSTEM_PROMPT,
  MASTER_SYSTEM_PROMPT,
  parseClaudeJson,
  POST_MORTEM_SYSTEM_PROMPT,
  PROPOSE_EXPERT_BRAIN_SYSTEM_PROMPT,
  PROPOSE_NICHE_SYSTEM_PROMPT,
  PROPOSE_RADAR_SEED_SYSTEM_PROMPT,
  RADAR_SUGGESTION_SYSTEM_PROMPT,
  SUMMARISE_SYSTEM_PROMPT,
  VOICE_SIGNATURE_EXTRACTION_SYSTEM_PROMPT,
} from "./prompts"
import {
  stubGenerateIdeas,
  stubGenerateScripts,
  stubPostMortem,
  stubProposeExpertBrain,
  stubProposeNiche,
  stubProposeRadarSeed,
  stubRadarSuggestion,
  stubSummariseContent,
} from "./stubs"
import type {
  AIResult,
  ContextSummary,
  ExpertBrainSeed,
  ExpertFrameworks,
  GeneratedScript,
  GenerationInput,
  HookFormula,
  IdeaProposal,
  IdeationInput,
  InspirationAnalysis,
  NicheProposal,
  PostMortem,
  RadarSeed,
  RadarSuggestion,
  VoiceSignature,
} from "./types"

// GPT-4o for heavy generation, GPT-4o-mini for fast/cheap operations.
const MODEL = "gpt-4o"
const FAST_MODEL = "gpt-4o-mini"
const MAX_OUTPUT_TOKENS = 8192

async function getClient(): Promise<OpenAI | null> {
  const key = await getSecret("openai_api_key")
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

function priceUsd(input: number, output: number, model: string = MODEL): number {
  // GPT-4o: $2.50/M input, $10/M output. GPT-4o-mini: $0.15/M input, $0.60/M output.
  if (model === FAST_MODEL) {
    return (input / 1_000_000) * 0.15 + (output / 1_000_000) * 0.60
  }
  return (input / 1_000_000) * 2.5 + (output / 1_000_000) * 10
}

/**
 * Core OpenAI call helper — mirrors the Anthropic callClaudeJson shape exactly.
 * Accepts system + user strings, returns parsed JSON data.
 */
async function callOpenAIJson<T>(opts: {
  system: string
  user: string
  maxTokens?: number
  model?: string
}): Promise<{ data: T; cost_usd: number; duration_ms: number; raw: string } | null> {
  const client = await getClient()
  if (!client) return null

  const model = opts.model ?? MODEL
  const t0 = Date.now()
  const response = await client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens ?? MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  })
  const duration_ms = Date.now() - t0

  const raw = response.choices[0]?.message?.content ?? ""
  const data = parseClaudeJson<T>(raw)

  const usage = response.usage
  const cost_usd = priceUsd(usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0, model)

  return { data, cost_usd, duration_ms, raw }
}

// ----------------------------------------------------------------------------
// Public API. Each operation transparently falls back to a stub if the key
// is missing. The AIResult.mode field tells callers which path ran.
// ----------------------------------------------------------------------------

export async function generateIdeas(
  input: IdeationInput
): Promise<AIResult<IdeaProposal[]>> {
  try {
    const client = await getClient()
    if (!client) {
      return { data: stubGenerateIdeas(input), mode: "stub" }
    }
    const t0 = Date.now()
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        { role: "system", content: IDEATION_SYSTEM_PROMPT },
        { role: "user", content: buildIdeationUserPrompt(input) },
      ],
    })
    const duration_ms = Date.now() - t0
    const raw = response.choices[0]?.message?.content ?? "[]"
    const parsed = parseClaudeJson<Array<Partial<IdeaProposal>>>(raw)
    const arr = Array.isArray(parsed) ? parsed : [parsed as unknown as Partial<IdeaProposal>]
    const cost_usd = priceUsd(response.usage?.prompt_tokens ?? 0, response.usage?.completion_tokens ?? 0)
    return {
      data: arr.map((p, i) => normaliseIdea(p, input.format, i)),
      mode: "real",
      cost_usd,
      duration_ms,
    }
  } catch (e) {
    console.error("[ai.generateIdeas] real call failed, falling back to stub:", e)
    return { data: stubGenerateIdeas(input), mode: "stub" }
  }
}

function normaliseIdea(
  p: Partial<IdeaProposal>,
  format: GenerationInput["format"],
  index: number
): IdeaProposal {
  const formulas: HookFormula[] = [
    "contrarian",
    "curiosity_gap",
    "pain_point",
    "secret_value",
    "time_bound_result",
    "mistake_callout",
    "numbered_list",
  ]
  const formula =
    p.hook_formula && formulas.includes(p.hook_formula as HookFormula)
      ? (p.hook_formula as HookFormula)
      : "curiosity_gap"
  return {
    id: `idea-${Date.now()}-${index}`,
    format,
    topic: p.topic ?? "",
    angle: p.angle ?? "",
    why_it_works: p.why_it_works ?? "",
    hook: format === "reel" ? p.hook ?? "" : undefined,
    hook_formula: format === "reel" ? formula : undefined,
    title: format === "long_form" ? p.title ?? "" : undefined,
  }
}

export async function generateScripts(
  input: GenerationInput
): Promise<AIResult<GeneratedScript[]>> {
  try {
    const client = await getClient()
    if (!client) {
      return { data: stubGenerateScripts(input), mode: "stub" }
    }
    const t0 = Date.now()
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        { role: "system", content: MASTER_SYSTEM_PROMPT },
        { role: "user", content: buildGeneratorUserPrompt(input) },
      ],
    })
    const duration_ms = Date.now() - t0
    const raw = response.choices[0]?.message?.content ?? "[]"
    const parsed = parseClaudeJson<GeneratedScript[]>(raw)
    const arr = Array.isArray(parsed) ? parsed : [parsed as unknown as GeneratedScript]
    const cost_usd = priceUsd(response.usage?.prompt_tokens ?? 0, response.usage?.completion_tokens ?? 0)
    return {
      data: arr.map(normaliseScript),
      mode: "real",
      cost_usd,
      duration_ms,
    }
  } catch (e) {
    console.error("[ai.generateScripts] real call failed, falling back to stub:", e)
    return { data: stubGenerateScripts(input), mode: "stub" }
  }
}

function normaliseScript(s: GeneratedScript): GeneratedScript {
  const formulas: HookFormula[] = [
    "contrarian",
    "curiosity_gap",
    "pain_point",
    "secret_value",
    "time_bound_result",
    "mistake_callout",
    "numbered_list",
  ]
  const safeFormula: HookFormula = formulas.includes(s.hook_formula)
    ? s.hook_formula
    : "curiosity_gap"

  const fullScript = s.full_script || `${s.hook ?? ""}\n\n${s.body ?? ""}\n\n${s.cta ?? ""}`.trim()

  const sections = Array.isArray(s.sections)
    ? s.sections.filter(
        (sec) =>
          sec &&
          typeof sec === "object" &&
          typeof sec.heading === "string" &&
          typeof sec.content === "string"
      )
    : undefined

  return {
    hook: s.hook ?? "",
    hook_formula: safeFormula,
    body: s.body ?? "",
    cta: s.cta ?? "",
    full_script: fullScript,
    caption: s.caption ?? "",
    keyword: (s.keyword ?? "").toUpperCase().trim(),
    hashtags: Array.isArray(s.hashtags) ? s.hashtags : [],
    topic: s.topic ?? "",
    angle: s.angle ?? "",
    target_length_s: typeof s.target_length_s === "number" ? s.target_length_s : 25,
    content_format: s.content_format,
    why_it_works: s.why_it_works ?? "",
    shot_ideas: Array.isArray(s.shot_ideas) ? s.shot_ideas : [],
    slides: Array.isArray(s.slides) ? s.slides : undefined,
    sections,
    title: typeof s.title === "string" ? s.title : undefined,
    total_duration_min:
      typeof s.total_duration_min === "number" ? s.total_duration_min : undefined,
  }
}

export async function summariseContent(input: {
  raw: string
  source_type: string
  source_url?: string | null
  title_hint?: string | null
  bucket?: string
}): Promise<AIResult<ContextSummary>> {
  const result = await callOpenAIJson<ContextSummary>({
    system: SUMMARISE_SYSTEM_PROMPT,
    user: buildSummariseUserPrompt(input),
    maxTokens: 1024,
    model: FAST_MODEL,
  }).catch((e) => {
    console.error("[ai.summariseContent] failed, falling back:", e)
    return null
  })

  if (!result) {
    return { data: stubSummariseContent(input), mode: "stub" }
  }
  return {
    data: {
      summary: result.data.summary || "",
      tags: Array.isArray(result.data.tags) ? result.data.tags : [],
      hook_extracted: result.data.hook_extracted ?? undefined,
    },
    mode: "real",
    cost_usd: result.cost_usd,
    duration_ms: result.duration_ms,
  }
}

export async function proposeNiche(
  answers: Record<string, string>
): Promise<AIResult<NicheProposal>> {
  const result = await callOpenAIJson<NicheProposal>({
    system: PROPOSE_NICHE_SYSTEM_PROMPT,
    user: buildProposeNicheUserPrompt(answers),
    maxTokens: 1024,
    model: FAST_MODEL,
  }).catch(() => null)
  if (!result) return { data: stubProposeNiche(answers), mode: "stub" }
  return { data: result.data, mode: "real", cost_usd: result.cost_usd, duration_ms: result.duration_ms }
}

export async function proposeRadarSeed(input: {
  niche: string
  avatar?: string | null
  offer?: string | null
}): Promise<AIResult<RadarSeed>> {
  const result = await callOpenAIJson<RadarSeed>({
    system: PROPOSE_RADAR_SEED_SYSTEM_PROMPT,
    user: buildProposeRadarSeedUserPrompt(input),
    maxTokens: 1024,
    model: FAST_MODEL,
  }).catch(() => null)
  if (!result) return { data: stubProposeRadarSeed(input.niche), mode: "stub" }
  return { data: result.data, mode: "real", cost_usd: result.cost_usd, duration_ms: result.duration_ms }
}

export async function proposeExpertBrain(input: {
  niche: string
  avatar?: string | null
}): Promise<AIResult<ExpertBrainSeed>> {
  const result = await callOpenAIJson<ExpertBrainSeed>({
    system: PROPOSE_EXPERT_BRAIN_SYSTEM_PROMPT,
    user: buildProposeExpertBrainUserPrompt(input),
    maxTokens: 1024,
    model: FAST_MODEL,
  }).catch(() => null)
  if (!result) return { data: stubProposeExpertBrain(input.niche), mode: "stub" }
  return { data: result.data, mode: "real", cost_usd: result.cost_usd, duration_ms: result.duration_ms }
}

export async function radarSuggestion(input: {
  caption: string
  transcript?: string
  metrics: Record<string, unknown>
  niche: string
  voice_tone: string
}): Promise<AIResult<RadarSuggestion>> {
  const result = await callOpenAIJson<RadarSuggestion>({
    system: RADAR_SUGGESTION_SYSTEM_PROMPT,
    user: buildRadarSuggestionUserPrompt(input),
    maxTokens: 512,
    model: FAST_MODEL,
  }).catch(() => null)
  if (!result)
    return {
      data: stubRadarSuggestion({
        caption: input.caption,
        transcript: input.transcript ?? "",
        metrics: input.metrics,
      }),
      mode: "stub",
    }
  return { data: result.data, mode: "real", cost_usd: result.cost_usd, duration_ms: result.duration_ms }
}

export async function postMortem(input: {
  hook: string
  hook_formula: string
  body_preview: string
  views: number
  median_views: number
}): Promise<AIResult<PostMortem>> {
  const result = await callOpenAIJson<PostMortem>({
    system: POST_MORTEM_SYSTEM_PROMPT,
    user: buildPostMortemUserPrompt(input),
    maxTokens: 512,
    model: FAST_MODEL,
  }).catch(() => null)
  if (!result)
    return {
      data: stubPostMortem({
        hook: input.hook,
        hook_formula: input.hook_formula as HookFormula,
        views: input.views,
        median: input.median_views,
      }),
      mode: "stub",
    }
  return { data: result.data, mode: "real", cost_usd: result.cost_usd, duration_ms: result.duration_ms }
}

export async function analyseInspirationVideo(input: {
  caption: string
  transcript: string
  author: string | null
  metrics: Record<string, unknown>
  niche?: string | null
}): Promise<AIResult<InspirationAnalysis> | null> {
  const client = await getClient()
  if (!client) return null

  try {
    const t0 = Date.now()
    const response = await client.chat.completions.create({
      model: FAST_MODEL,
      max_tokens: 1500,
      messages: [
        { role: "system", content: INSPIRATION_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: buildInspirationAnalysisUserPrompt(input) },
      ],
    })
    const duration_ms = Date.now() - t0
    const raw = response.choices[0]?.message?.content ?? "{}"
    const parsed = parseClaudeJson<InspirationAnalysis>(raw)
    const cost_usd = priceUsd(
      response.usage?.prompt_tokens ?? 0,
      response.usage?.completion_tokens ?? 0,
      FAST_MODEL
    )

    return {
      data: {
        hook: parsed.hook ?? "",
        hook_formula: parsed.hook_formula ?? "curiosity_gap",
        body_summary: parsed.body_summary ?? "",
        cta: parsed.cta ?? "none",
        why_it_works: parsed.why_it_works ?? "",
        key_findings: Array.isArray(parsed.key_findings) ? parsed.key_findings : [],
        reusable_hook_template: parsed.reusable_hook_template ?? "",
      },
      mode: "real",
      cost_usd,
      duration_ms,
    }
  } catch (e) {
    console.error("[ai.analyseInspirationVideo] failed:", e)
    return null
  }
}

export async function extractExpertFrameworks(input: {
  title: string | null
  source_type: string
  raw: string
}): Promise<AIResult<ExpertFrameworks> | null> {
  const client = await getClient()
  if (!client) return null

  try {
    const t0 = Date.now()
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        { role: "system", content: EXPERT_FRAMEWORK_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExpertFrameworkExtractionUserPrompt(input) },
      ],
    })
    const duration_ms = Date.now() - t0
    const raw = response.choices[0]?.message?.content ?? "{}"
    const parsed = parseClaudeJson<Partial<ExpertFrameworks>>(raw)
    const cost_usd = priceUsd(response.usage?.prompt_tokens ?? 0, response.usage?.completion_tokens ?? 0)
    return {
      data: {
        frameworks: Array.isArray(parsed.frameworks)
          ? parsed.frameworks.map((f) => ({
              name: typeof f?.name === "string" ? f.name : "",
              steps: Array.isArray(f?.steps) ? f.steps.filter((s): s is string => typeof s === "string") : [],
              when_to_use: typeof f?.when_to_use === "string" ? f.when_to_use : "",
            }))
          : [],
        principles: Array.isArray(parsed.principles)
          ? parsed.principles.filter((p): p is string => typeof p === "string")
          : [],
        mental_models: Array.isArray(parsed.mental_models)
          ? parsed.mental_models.filter((m): m is string => typeof m === "string")
          : [],
        key_terminology: Array.isArray(parsed.key_terminology)
          ? parsed.key_terminology.filter((k): k is string => typeof k === "string")
          : [],
        case_studies: Array.isArray(parsed.case_studies)
          ? parsed.case_studies.map((c) => ({
              subject: typeof c?.subject === "string" ? c.subject : "",
              outcome: typeof c?.outcome === "string" ? c.outcome : "",
              what_caused_it: typeof c?.what_caused_it === "string" ? c.what_caused_it : "",
            }))
          : [],
      },
      mode: "real",
      cost_usd,
      duration_ms,
    }
  } catch (e) {
    console.error("[ai.extractExpertFrameworks] failed:", e)
    return null
  }
}

export async function extractVoiceSignature(input: {
  title: string | null
  source_type: string
  raw: string
}): Promise<AIResult<VoiceSignature> | null> {
  const client = await getClient()
  if (!client) return null

  try {
    const t0 = Date.now()
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: VOICE_SIGNATURE_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildVoiceSignatureExtractionUserPrompt(input) },
      ],
    })
    const duration_ms = Date.now() - t0
    const raw = response.choices[0]?.message?.content ?? "{}"
    const parsed = parseClaudeJson<Partial<VoiceSignature>>(raw)
    const cost_usd = priceUsd(response.usage?.prompt_tokens ?? 0, response.usage?.completion_tokens ?? 0)

    const profanityLevels: VoiceSignature["profanity_level"][] = [
      "none",
      "light",
      "moderate",
      "heavy",
    ]
    const safeProfanity: VoiceSignature["profanity_level"] = profanityLevels.includes(
      parsed.profanity_level as VoiceSignature["profanity_level"]
    )
      ? (parsed.profanity_level as VoiceSignature["profanity_level"])
      : "none"

    return {
      data: {
        avg_sentence_length:
          typeof parsed.avg_sentence_length === "number" && parsed.avg_sentence_length > 0
            ? Math.round(parsed.avg_sentence_length)
            : 0,
        sentence_rhythm:
          typeof parsed.sentence_rhythm === "string" ? parsed.sentence_rhythm : "",
        opening_patterns: Array.isArray(parsed.opening_patterns)
          ? parsed.opening_patterns.filter((s): s is string => typeof s === "string")
          : [],
        closing_patterns: Array.isArray(parsed.closing_patterns)
          ? parsed.closing_patterns.filter((s): s is string => typeof s === "string")
          : [],
        signature_phrases: Array.isArray(parsed.signature_phrases)
          ? parsed.signature_phrases.filter((s): s is string => typeof s === "string")
          : [],
        filler_words: Array.isArray(parsed.filler_words)
          ? parsed.filler_words.filter((s): s is string => typeof s === "string")
          : [],
        profanity_level: safeProfanity,
        profanity_examples: Array.isArray(parsed.profanity_examples)
          ? parsed.profanity_examples.filter((s): s is string => typeof s === "string")
          : [],
        register: typeof parsed.register === "string" ? parsed.register : "",
        distinctive_moves: Array.isArray(parsed.distinctive_moves)
          ? parsed.distinctive_moves.filter((s): s is string => typeof s === "string")
          : [],
      },
      mode: "real",
      cost_usd,
      duration_ms,
    }
  } catch (e) {
    console.error("[ai.extractVoiceSignature] failed:", e)
    return null
  }
}

/** Named isClaudeConfigured for backward compatibility with all callers */
export async function isClaudeConfigured(): Promise<boolean> {
  return Boolean(await getSecret("openai_api_key"))
}
