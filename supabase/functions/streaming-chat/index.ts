import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const data = await req.json()
    const message = data.message as string
    const userId = data.user_id as string
    const firstName = data.first_name as string
    const lastName = data.last_name as string
    const email = data.email as string
    const dietaryPreference = data.dietary_preference as string
    const allergies = data.allergies as string
    const mealsPerDay = data.meals_per_day as string
    const adultsCount = data.adults_count as string
    const childrenCount = data.children_count as string
    const timestamp = data.timestamp as string
    const sessionId = data.session_id as string

    console.log('Received streaming chat request:', {
      userId,
      firstName,
      lastName,
      email,
      message: message?.substring(0, 100) + '...',
      dietaryPreference,
      allergies,
      mealsPerDay,
      adultsCount,
      childrenCount,
      timestamp,
      sessionId
    })

    // Create a JSON payload to send to the webhook
    const webhookPayload = {
      message: message || '',
      timestamp: timestamp || new Date().toISOString(),
      user_id: userId || '',
      first_name: firstName || '',
      last_name: lastName || '',
      email: email || '',
      dietary_preference: dietaryPreference || '',
      allergies: allergies || '',
      meals_per_day: mealsPerDay || '',
      adults_count: adultsCount || '',
      children_count: childrenCount || '',
      session_id: sessionId || '',
    }
    
    console.log('Sending webhook with JSON payload:', webhookPayload)
    
    try {
      const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
      if (!webhookUrl) {
        throw new Error('N8N_WEBHOOK_URL is not set in environment variables.')
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      })
      
      console.log('Webhook response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`Webhook responded with status: ${response.status}`)
      }
      
      const responseText = await response.text()
      console.log('Received response from webhook:', responseText.substring(0, 200) + '...')
      
      // Parse the response
      let messageContent = "I'm here to help you plan your meals and create grocery lists! What would you like to work on today?"
      
      try {
        const parsedResponse = JSON.parse(responseText)
        if (Array.isArray(parsedResponse) && parsedResponse[0]?.output) {
          messageContent = parsedResponse[0].output
        } else if (parsedResponse?.output) {
          messageContent = parsedResponse.output
        } else {
          messageContent = responseText
        }
      } catch (parseError) {
        console.log('Failed to parse JSON, using raw response:', parseError)
        messageContent = responseText || "I'm here to help you plan your meals and create grocery lists! What would you like to work on today?"
      }

      console.log('Final message content:', messageContent.substring(0, 100) + '...')

      return new Response(JSON.stringify({ 
        message: messageContent 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      
    } catch (error) {
      console.error('Error calling webhook:', error)
      
      let errorMessage = "Sorry, I'm having trouble connecting right now. Please try again."
      if (error.name === 'AbortError') {
        errorMessage = "The request timed out. Please try again with a shorter message."
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('Error in streaming chat:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})