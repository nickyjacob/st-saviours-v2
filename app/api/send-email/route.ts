export const dynamic = 'force-dynamic'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function emailWrapper(content: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f4f4;padding:24px">
      <div style="background:white;borderRadius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <div style="background:#111;padding:20px 24px;text-align:center">
          <h1 style="color:white;margin:0;font-size:18px">St. Saviours GAA & LGFA</h1>
          <p style="color:#9ca3af;margin:4px 0 0;font-size:13px">Pitch Booking System</p>
        </div>
        <div style="padding:24px">
          ${content}
        </div>
        <div style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:12px;color:#9ca3af">
          St. Saviours GAA & LGFA · Pitch Booking System
        </div>
      </div>
    </div>
  `
}

function bookingTable(b: Record<string, string>) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      ${Object.entries(b).map(([k, v]) => `
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151;width:35%;border-bottom:1px solid #e5e7eb">${k}</td>
          <td style="padding:8px 12px;color:#111;border-bottom:1px solid #e5e7eb">${v}</td>
        </tr>
      `).join('')}
    </table>
  `
}

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const body = await req.json()
    const { type, booking, userEmail, userName } = body

    if (type === 'new_booking') {
      // Get all admin emails
      const { data: admins } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'admin')
        .eq('is_approved', true)

      if (!admins || admins.length === 0) {
        return NextResponse.json({ error: 'No admins found' }, { status: 400 })
      }

      const adminEmails = admins.map((a: { email: string }) => a.email)

      const html = emailWrapper(`
        <h2 style="margin:0 0 4px;font-size:18px;color:#111">New Booking Request 📋</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px">New request submitted by ${userName}.</p>
        ${bookingTable({
          'Team': booking.team_name,
          'Pitch': booking.pitch_name,
          'Date': booking.date_display,
          'Time': booking.time_display,
          'Purpose': booking.purpose,
        })}
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://st-saviours-v2.vercel.app'}/admin" 
           style="display:inline-block;background:#111;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin-top:8px">
          Review in Admin Panel →
        </a>
      `)

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: adminEmails,
        subject: `📋 New Booking Request — ${booking.team_name} on ${booking.date_display}`,
        html,
      })
    }

    if (type === 'booking_approved') {
      const html = emailWrapper(`
        <h2 style="margin:0 0 4px;font-size:18px;color:#16a34a">Booking Approved ✅</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px">Great news! Your booking has been approved.</p>
        ${bookingTable({
          'Team': booking.team_name,
          'Pitch': booking.pitch_name,
          'Date': booking.date_display,
          'Time': booking.time_display,
          'Purpose': booking.purpose,
        })}
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://st-saviours-v2.vercel.app'}/my-bookings"
           style="display:inline-block;background:#111;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin-top:8px">
          View My Bookings →
        </a>
      `)

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [userEmail],
        subject: `✅ Booking Approved — ${booking.team_name} on ${booking.date_display}`,
        html,
      })
    }

    if (type === 'booking_rejected') {
      const html = emailWrapper(`
        <h2 style="margin:0 0 4px;font-size:18px;color:#dc2626">Booking Declined ❌</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px">Unfortunately your booking request has been declined. Please contact the club for more information.</p>
        ${bookingTable({
          'Team': booking.team_name,
          'Pitch': booking.pitch_name,
          'Date': booking.date_display,
          'Time': booking.time_display,
          'Purpose': booking.purpose,
        })}
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://st-saviours-v2.vercel.app'}/new-booking"
           style="display:inline-block;background:#111;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin-top:8px">
          Make a New Booking →
        </a>
      `)

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [userEmail],
        subject: `❌ Booking Declined — ${booking.team_name} on ${booking.date_display}`,
        html,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}