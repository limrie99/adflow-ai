import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prospects } = await req.json()

  if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
    return NextResponse.json({ error: 'No prospects data provided' }, { status: 400 })
  }

  // Format data for Excel
  const rows = prospects.map((p: Record<string, unknown>, i: number) => ({
    '#': i + 1,
    'Business Name': p.business_name || '',
    'Industry': p.likely_services ? (p.likely_services as string[]).join(', ') : '',
    'Website': p.website || '',
    'Phone': p.phone || '',
    'Email': p.email || '',
    'Instagram': p.instagram || '',
    'Address': p.address || '',
    'Outreach Angle': p.outreach_angle || '',
    'Suggested Message': p.suggested_message || '',
  }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Set column widths
  ws['!cols'] = [
    { wch: 4 },  // #
    { wch: 30 }, // Business Name
    { wch: 25 }, // Industry
    { wch: 35 }, // Website
    { wch: 15 }, // Phone
    { wch: 30 }, // Email
    { wch: 25 }, // Instagram
    { wch: 40 }, // Address
    { wch: 40 }, // Outreach Angle
    { wch: 60 }, // Suggested Message
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Prospects')

  // Generate buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="prospects-${Date.now()}.xlsx"`,
    },
  })
}
