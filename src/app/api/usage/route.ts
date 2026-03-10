import { NextRequest, NextResponse } from 'next/server'
import { getUsageThisMonth, getCredits } from '@/lib/usage'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [usage, credits] = await Promise.all([
    getUsageThisMonth(user.id),
    getCredits(user.id),
  ])
  return NextResponse.json({ ...usage, credits })
}
