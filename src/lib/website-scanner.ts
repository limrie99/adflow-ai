import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ScannedBusiness {
  business_name: string
  industry: string
  location: string
  services: string[]
  pricing: { item: string; price: string }[]
  unique_selling_points: string[]
  contact: { phone?: string; email?: string; address?: string }
  inventory_highlights: string[]
  website_url: string
  raw_summary: string
}

export async function scanWebsite(url: string): Promise<ScannedBusiness> {
  // Fetch the website HTML
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AdFlowBot/1.0)',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`Failed to fetch website: ${res.status}`)

  const html = await res.text()

  // Strip HTML to text (keep structure hints)
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000) // Keep within token limits

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are a business intelligence analyst. Analyze this website content and extract structured business data.

Website URL: ${url}

Website content:
${text}

Return a JSON object with this exact structure:
{
  "business_name": "the actual business name",
  "industry": "specific industry (e.g. 'car dealership', 'dental clinic', 'roofing contractor')",
  "location": "city, state if found",
  "services": ["list of services/products they offer"],
  "pricing": [{"item": "service/product name", "price": "$X or price range"}],
  "unique_selling_points": ["what makes them different - years in business, guarantees, awards, etc"],
  "contact": {"phone": "if found", "email": "if found", "address": "if found"},
  "inventory_highlights": ["specific products, listings, or featured items with real details like prices, specs"],
  "raw_summary": "2-3 sentence summary of this business and what they do"
}

Extract ONLY real data from the website. Never invent or hallucinate details. If something isn't on the page, leave it empty or omit it. Focus on extracting actual pricing, real services, and genuine details.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  const parsed = JSON.parse(jsonMatch[0]) as ScannedBusiness
  parsed.website_url = url

  return parsed
}

export async function generateCompetitorStrategy(
  niche: string,
  location: string,
  businessContext?: string
): Promise<{
  tactics: { name: string; description: string; effectiveness: string }[]
  ad_patterns: string[]
  seasonal_opportunities: string[]
  recommended_offers: string[]
  recommended_ctas: string[]
  strategy_summary: string
}> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [
      {
        role: 'user',
        content: `You are a top-tier paid media strategist who has managed millions in ad spend for ${niche} businesses.

Location: ${location}
${businessContext ? `Business context: ${businessContext}` : ''}

Based on your deep knowledge of what works in ${niche} advertising, provide a comprehensive competitive strategy analysis.

Think about:
- What the top-performing ${niche} businesses in markets like ${location} are doing with their Facebook/Instagram and Google ads
- The most effective ad formats, hooks, and conversion tactics
- Seasonal patterns and timing opportunities
- Offers that consistently generate leads

Return a JSON object:
{
  "tactics": [
    {"name": "tactic name", "description": "detailed explanation", "effectiveness": "high/medium/low"}
  ],
  "ad_patterns": ["specific ad patterns that work - e.g. 'before/after photos', 'video testimonials', 'urgency countdown'"],
  "seasonal_opportunities": ["time-based opportunities - e.g. 'Spring cleaning season for HVAC', 'Tax season for accountants'"],
  "recommended_offers": ["specific offers that convert well for this niche"],
  "recommended_ctas": ["high-converting call-to-action phrases"],
  "strategy_summary": "2-3 paragraph executive summary of the recommended strategy"
}

Be specific and actionable. These recommendations should be immediately implementable.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  return JSON.parse(jsonMatch[0])
}

export async function findProspects(
  niche: string,
  location: string,
  count: number = 15
): Promise<{
  prospects: {
    business_name: string
    likely_services: string[]
    outreach_angle: string
    suggested_message: string
  }[]
  search_tips: string[]
}> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [
      {
        role: 'user',
        content: `You are a B2B sales strategist specializing in selling marketing services to local ${niche} businesses.

Location: ${location}
Target: ${niche} businesses that would benefit from professional ad management

Generate a prospecting plan with ${count} likely business types/profiles in the ${location} area. For each, provide a tailored outreach angle and a short DM message.

Return a JSON object:
{
  "prospects": [
    {
      "business_name": "Example: '[Type] in ${location}' - use realistic business name patterns for the area",
      "likely_services": ["what they likely offer"],
      "outreach_angle": "specific pain point or opportunity to lead with",
      "suggested_message": "a short, personalized Instagram DM (under 100 words, conversational, not salesy)"
    }
  ],
  "search_tips": ["practical tips for finding these businesses - e.g. 'Search Google Maps for dentists in ${location}', 'Check Instagram hashtags like #${location}dentist'"]
}

Make the prospect profiles realistic for the ${location} market. The outreach messages should feel genuine and mention a specific pain point.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  return JSON.parse(jsonMatch[0])
}

export async function generateAdsFromWebsiteData(
  scannedData: ScannedBusiness,
  strategy: { recommended_offers: string[]; recommended_ctas: string[]; strategy_summary: string },
  platform: 'meta' | 'google'
): Promise<{
  ads: {
    headline: string
    primary_text: string
    description: string
    call_to_action: string
    image_prompt: string
  }[]
  strategy_notes: string
}> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are an elite direct-response copywriter. Create ads using REAL data from this business.

REAL Business Data:
- Name: ${scannedData.business_name}
- Industry: ${scannedData.industry}
- Location: ${scannedData.location}
- Services: ${scannedData.services.join(', ')}
- Pricing: ${scannedData.pricing.map((p) => `${p.item}: ${p.price}`).join(', ')}
- USPs: ${scannedData.unique_selling_points.join(', ')}
- Inventory/Featured: ${scannedData.inventory_highlights.join(', ')}

Competitive Strategy Context:
- Recommended offers: ${strategy.recommended_offers.join(', ')}
- Recommended CTAs: ${strategy.recommended_ctas.join(', ')}
- Strategy: ${strategy.strategy_summary}

Platform: ${platform === 'meta' ? 'Facebook/Instagram feed ads' : 'Google search ads'}

Generate 3 high-converting ad variations. USE REAL DATA from the business - real prices, real services, real details. No generic copy.

Return JSON:
{
  "ads": [
    {
      "headline": "max 40 chars for Google, 60 for Meta - use real business details",
      "primary_text": "compelling body copy with real pricing/services, 2-3 sentences",
      "description": "supporting detail with specifics, 1-2 sentences",
      "call_to_action": "action button text",
      "image_prompt": "detailed prompt for generating an ad image featuring the actual business"
    }
  ],
  "strategy_notes": "why these ads will convert, referencing the real data used"
}

Every ad MUST reference real details from the website scan. No hallucinated data.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  return JSON.parse(jsonMatch[0])
}
