/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Webhook handler for Telegram
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error('Telegram credentials not configured')
    }

    const payload = await req.json()

    let message = '🔔 *Nuova Notifica da Root Salon Manager*\n\n'

    // Formatta il messaggio in base alla tabella che ha scatenato l'evento
    if (payload.table === 'users' && payload.type === 'INSERT') {
      message += `🧑🏻‍💻 *Nuovo Utente Registrato!*\n`
      message += `Email: ${payload.record.email || 'Nessuna email fornita'}\n`
      message += `ID: ${payload.record.id}\n`
    } else if (payload.table === 'user_feedbacks' && payload.type === 'INSERT') {
      const typeLabel = payload.record.type === 'bug' ? '⚠ Problema' : payload.record.type === 'idea' ? '💡 Nuova Idea' : '💬 Altro Feedback';
      message += `📝 *Nuovo Feedback (${typeLabel})*\n`
      message += `Titolo: ${payload.record.title}\n`
      message += `Descrizione:\n_${payload.record.description}_\n`
    } else {
      message += `Evento sconosciuto da webhook.\nTabella: ${payload.table}`
    }

    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`

    const tgResponse = await fetch(tgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    })

    if (!tgResponse.ok) {
      const tgError = await tgResponse.text()
      console.error('Error sending message to Telegram:', tgError)
      throw new Error(`Telegram API error: ${tgResponse.status}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
