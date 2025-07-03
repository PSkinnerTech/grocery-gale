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
    const formData = await req.formData()
    const message = formData.get('message') as string
    const userId = formData.get('user_id') as string
    const firstName = formData.get('first_name') as string
    const lastName = formData.get('last_name') as string
    const dietaryPreference = formData.get('dietary_preference') as string
    const allergies = formData.get('allergies') as string
    const mealsPerDay = formData.get('meals_per_day') as string
    const adultsCount = formData.get('adults_count') as string
    const childrenCount = formData.get('children_count') as string

    console.log('Received streaming chat request:', {
      userId,
      firstName,
      lastName,
      message: message?.substring(0, 100) + '...',
      dietaryPreference,
      allergies,
      mealsPerDay,
      adultsCount,
      childrenCount
    })

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
        
        // Forward to the original webhook
        const forwardFormData = new FormData()
        forwardFormData.append('message', message || '')
        forwardFormData.append('timestamp', new Date().toISOString())
        forwardFormData.append('user_id', userId || '')
        forwardFormData.append('first_name', firstName || '')
        forwardFormData.append('last_name', lastName || '')
        forwardFormData.append('dietary_preference', dietaryPreference || '')
        forwardFormData.append('allergies', allergies || '')
        forwardFormData.append('meals_per_day', mealsPerDay || '')
        forwardFormData.append('adults_count', adultsCount || '')
        forwardFormData.append('children_count', childrenCount || '')
        
        console.log('Forwarding to webhook...')
        
        fetch('https://pskinnertech.app.n8n.cloud/webhook-test/gale', {
          method: 'POST',
          body: forwardFormData,
        })
        .then(response => {
          console.log('Webhook response status:', response.status)
          if (!response.ok) {
            throw new Error(`Webhook responded with status: ${response.status}`)
          }
          return response.text()
        })
        .then(responseText => {
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
            messageContent = responseText
          }

          console.log('Final message content:', messageContent.substring(0, 100) + '...')

          // Stream the response word by word
          const words = messageContent.split(' ')
          let wordIndex = 0

          const sendNextWord = () => {
            if (wordIndex < words.length) {
              const word = words[wordIndex]
              controller.enqueue(`data: ${JSON.stringify({ 
                type: 'delta', 
                content: word + ' ',
                isComplete: false 
              })}\n\n`)
              wordIndex++
              setTimeout(sendNextWord, 30) // Faster streaming - 30ms delay
            } else {
              // Send completion signal
              controller.enqueue(`data: ${JSON.stringify({ 
                type: 'complete',
                isComplete: true 
              })}\n\n`)
              controller.close()
            }
          }

          sendNextWord()
        })
        .catch(error => {
          console.error('Error calling webhook:', error)
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'error', 
            content: "Sorry, I'm having trouble connecting right now. Please try again.",
            isComplete: true 
          })}\n\n`)
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

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