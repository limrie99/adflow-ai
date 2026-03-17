import { z } from 'zod'

// Admin ads - allowed fields for PATCH (whitelist approach)
export const adminAdPatchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  platform: z.enum(['meta', 'google']).optional(),
  ad_copy: z.object({
    headline: z.string().optional(),
    body: z.string().optional(),
    cta: z.string().optional(),
    image_url: z.string().optional(),
    image_prompt: z.string().optional(),
  }).optional(),
  targeting: z.record(z.string(), z.unknown()).optional(),
  budget_daily: z.number().positive().optional(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'live', 'paused', 'completed']).optional(),
  scheduled_for: z.string().optional().nullable(),
}).strict()

// Admin ads - POST create
export const adminAdCreateSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1),
  platform: z.enum(['meta', 'google']).default('meta'),
  ad_copy: z.record(z.string(), z.unknown()).default({}),
  targeting: z.record(z.string(), z.unknown()).default({}),
  budget_daily: z.number().positive().optional().nullable(),
  status: z.enum(['draft', 'pending_approval']).default('draft'),
  scheduled_for: z.string().optional().nullable(),
})

// Client ads - PATCH (only approve/reject)
export const clientAdPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  client_feedback: z.string().max(2000).optional(),
  approved_at: z.string().optional(),
  rejected_at: z.string().optional(),
})

// Admin clients - POST create
export const clientCreateSchema = z.object({
  business_name: z.string().min(1).max(200),
  contact_name: z.string().max(200).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().max(30).optional(),
  niche: z.string().max(100).optional(),
  website: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  monthly_ad_budget: z.number().positive().optional().nullable(),
  notes: z.string().max(5000).optional(),
})

// Admin clients - PATCH update
export const clientUpdateSchema = z.object({
  id: z.string().uuid(),
  business_name: z.string().min(1).max(200).optional(),
  contact_name: z.string().max(200).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().max(30).optional(),
  niche: z.string().max(100).optional(),
  website: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  monthly_ad_budget: z.number().positive().optional().nullable(),
  status: z.enum(['active', 'paused', 'churned']).optional(),
  notes: z.string().max(5000).optional(),
}).strict()

// Stripe checkout
export const checkoutSchema = z.object({
  package_id: z.string().uuid(),
  client_id: z.string().uuid(),
})

// Admin invite
export const inviteSchema = z.object({
  client_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6).max(100),
})
