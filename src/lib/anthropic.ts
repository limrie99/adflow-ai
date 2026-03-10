import Anthropic from '@anthropic-ai/sdk'
import type { GenerateAdRequest, GenerateAdResponse, AdCopy } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const NICHE_CONTEXT = {
  real_estate: {
    pain_points: ['finding qualified buyers', 'standing out in competitive markets', 'generating seller leads', 'showcasing listings'],
    offers: ['free home valuation', 'cash offer in 24 hours', 'sell in 30 days guaranteed', 'zero commission options'],
    ctas: ['Get Your Free Home Valuation', 'See Homes in Your Budget', 'Book a Showing', 'Get a Cash Offer Today'],
  },
  law: {
    pain_points: ['finding affordable legal help', 'understanding rights', 'navigating complex cases', 'time-sensitive legal issues'],
    offers: ['free consultation', 'no win no fee', '24/7 availability', 'same-day appointments'],
    ctas: ['Book a Free Consultation', 'Speak to a Lawyer Today', 'Get Legal Help Now', 'Claim Your Free Case Review'],
  },
}

export async function generateAdCopy(req: GenerateAdRequest): Promise<GenerateAdResponse> {
  const context = NICHE_CONTEXT[req.niche]

  const prompt = `You are an expert direct-response copywriter specializing in ${req.niche === 'real_estate' ? 'real estate' : 'legal services'} ads.

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
  niche: 'real_estate' | 'law',
  businessName: string,
  recipientName?: string
): Promise<string> {
  const prompt = `Write a short, genuine Instagram DM for a ${niche === 'real_estate' ? 'real estate' : 'legal'} marketing agency pitching their AI-powered ad service.

Agency: AdFlow AI
Target: ${recipientName ? recipientName : 'a local ' + (niche === 'real_estate' ? 'real estate agent' : 'law firm')}

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
