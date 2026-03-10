import Anthropic from '@anthropic-ai/sdk'
import type { GenerateAdRequest, GenerateAdResponse, AdCopy } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const NICHE_CONTEXT: Record<string, { label: string; pain_points: string[]; offers: string[]; ctas: string[] }> = {
  real_estate: {
    label: 'real estate',
    pain_points: ['finding qualified buyers', 'standing out in competitive markets', 'generating seller leads', 'showcasing listings'],
    offers: ['free home valuation', 'cash offer in 24 hours', 'sell in 30 days guaranteed', 'zero commission options'],
    ctas: ['Get Your Free Home Valuation', 'See Homes in Your Budget', 'Book a Showing', 'Get a Cash Offer Today'],
  },
  law: {
    label: 'legal services',
    pain_points: ['finding affordable legal help', 'understanding rights', 'navigating complex cases', 'time-sensitive legal issues'],
    offers: ['free consultation', 'no win no fee', '24/7 availability', 'same-day appointments'],
    ctas: ['Book a Free Consultation', 'Speak to a Lawyer Today', 'Get Legal Help Now', 'Claim Your Free Case Review'],
  },
  home_services: {
    label: 'home services',
    pain_points: ['finding reliable contractors', 'emergency repairs', 'getting fair pricing', 'trusting strangers in your home'],
    offers: ['free estimate', '$50 off first service', 'same-day service', 'senior discount'],
    ctas: ['Get a Free Estimate', 'Book Same-Day Service', 'Call Now for Emergency Repair', 'Claim Your $50 Discount'],
  },
  medical_dental: {
    label: 'medical & dental',
    pain_points: ['finding a new dentist', 'cost of cosmetic procedures', 'fear of dental visits', 'long wait times'],
    offers: ['free consultation', 'new patient special', '$99 teeth whitening', 'complimentary skin assessment'],
    ctas: ['Book Your Free Consultation', 'Claim New Patient Special', 'Schedule Your Visit', 'Get a Free Assessment'],
  },
  local_services: {
    label: 'local services',
    pain_points: ['finding quality local providers', 'inconsistent service', 'booking convenience', 'first-time trust'],
    offers: ['first visit discount', 'free trial class', 'refer a friend bonus', 'membership deals'],
    ctas: ['Book Your First Visit', 'Claim Your Free Trial', 'Get 20% Off Today', 'Reserve Your Spot'],
  },
  automotive: {
    label: 'automotive',
    pain_points: ['finding trustworthy mechanics', 'unexpected repair costs', 'keeping vehicles maintained', 'fair pricing'],
    offers: ['free inspection', 'oil change special', 'brake check included', 'price match guarantee'],
    ctas: ['Book a Free Inspection', 'Get Your Oil Change Deal', 'Schedule Service Today', 'Get a Quote Now'],
  },
  wedding: {
    label: 'wedding services',
    pain_points: ['staying within budget', 'finding available vendors', 'coordinating multiple services', 'quality assurance'],
    offers: ['free consultation', 'package deals', 'early booking discount', 'complimentary engagement session'],
    ctas: ['Book a Free Consultation', 'See Our Packages', 'Check Availability', 'View Our Portfolio'],
  },
}

export async function generateAdCopy(req: GenerateAdRequest): Promise<GenerateAdResponse> {
  const context = NICHE_CONTEXT[req.niche]

  const prompt = `You are an expert direct-response copywriter specializing in ${context.label} ads.

Business: ${req.business_name}
Location: ${req.location}
Platform: ${req.platform === 'meta' ? 'Facebook/Instagram' : 'Google Ads'}
${req.offer ? `Special Offer: ${req.offer}` : ''}
${req.unique_value ? `Unique Value: ${req.unique_value}` : ''}

Niche context:
- Common pain points: ${context.pain_points.join(', ')}
- Proven offers: ${context.offers.join(', ')}
- High-converting CTAs: ${context.ctas.join(', ')}

Generate 3 high-converting ad variations optimized for ${req.platform === 'meta' ? 'Facebook/Instagram feed ads' : 'Google search ads'}.

Return a JSON object with this exact structure:
{
  "ads": [
    {
      "headline": "max 40 chars for Google, 60 for Meta",
      "primary_text": "compelling body copy 1-3 sentences",
      "description": "supporting detail, 1-2 sentences",
      "call_to_action": "action button text",
      "image_prompt": "detailed prompt for generating an ad image"
    }
  ],
  "strategy_notes": "brief explanation of the approach and why these ads will convert"
}

Focus on: urgency, specificity, local relevance, clear value proposition. No fluff.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  return JSON.parse(jsonMatch[0]) as GenerateAdResponse
}

export async function generateOutreachMessage(
  niche: string,
  businessName: string,
  recipientName?: string
): Promise<string> {
  const context = NICHE_CONTEXT[niche] || NICHE_CONTEXT.home_services
  const prompt = `Write a short, genuine Instagram DM for a ${context.label} marketing agency pitching their AI-powered ad service.

Agency: AdFlow AI
Target: ${recipientName ? recipientName : 'a local ' + context.label + ' business'}

Requirements:
- Under 150 words
- Conversational, not salesy
- Mention one specific pain point they likely have
- Offer something valuable upfront (free ad audit or sample ad)
- End with a simple question to start a conversation
- Do NOT use emojis or exclamation points excessively

Return only the message text, no formatting or explanation.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text.trim()
}
