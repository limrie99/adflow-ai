import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface BrandStyleGuide {
  agency_name: string
  tagline: string
  color_palette: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    muted: string
  }
  typography: {
    heading_font: string
    body_font: string
    style_notes: string
  }
  tone_of_voice: {
    personality: string[]
    do: string[]
    dont: string[]
    example_headlines: string[]
  }
  visual_guidelines: {
    image_style: string
    layout_principles: string[]
    ad_format_notes: string
  }
  niche_specific: {
    industry_context: string
    target_audience: string
    emotional_triggers: string[]
  }
}

export async function generateBrandStyleGuide(
  niche: string,
  agencyName?: string,
  targetAudience?: string,
  brandVibe?: string
): Promise<BrandStyleGuide> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [
      {
        role: 'user',
        content: `You are a senior brand strategist and creative director. Create a complete brand style guide for an AI-powered ad agency specializing in ${niche}.

${agencyName ? `Agency name: ${agencyName}` : 'Come up with a premium, modern agency name.'}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${brandVibe ? `Brand vibe/style: ${brandVibe}` : 'Premium, modern, results-driven.'}

Create a comprehensive brand style guide. Return a JSON object:
{
  "agency_name": "the agency name",
  "tagline": "a short, punchy tagline",
  "color_palette": {
    "primary": "#hex - main brand color (bold, attention-grabbing)",
    "secondary": "#hex - supporting color",
    "accent": "#hex - for CTAs and highlights",
    "background": "#hex - dark or light background",
    "text": "#hex - primary text color",
    "muted": "#hex - secondary text / subtle elements"
  },
  "typography": {
    "heading_font": "specific Google Font name for headlines",
    "body_font": "specific Google Font name for body text",
    "style_notes": "how to use the fonts - weights, sizes, spacing"
  },
  "tone_of_voice": {
    "personality": ["3-5 adjectives that define the brand voice"],
    "do": ["5 things the copy should always do"],
    "dont": ["5 things the copy should never do"],
    "example_headlines": ["4 example ad headlines in this brand voice"]
  },
  "visual_guidelines": {
    "image_style": "detailed description of photo/image style for ads",
    "layout_principles": ["5 layout rules for ad creatives"],
    "ad_format_notes": "specific notes for Facebook/Instagram/Google ad formats"
  },
  "niche_specific": {
    "industry_context": "key things to know about advertising in this niche",
    "target_audience": "detailed description of the ideal customer",
    "emotional_triggers": ["5 emotional triggers that drive action in this niche"]
  }
}

Make the colors work well together. The palette should be premium and modern, suitable for high-converting paid ads. Pick real Google Fonts that pair well together.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  return JSON.parse(jsonMatch[0]) as BrandStyleGuide
}
