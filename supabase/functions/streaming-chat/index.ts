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
    const timestamp = formData.get('timestamp') as string

    console.log('Received streaming chat request:', {
      userId,
      firstName,
      lastName,
      message: message?.substring(0, 100) + '...',
      dietaryPreference,
      allergies,
      mealsPerDay,
      adultsCount,
      childrenCount,
      timestamp
    })

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
          
          // Create the exact FormData that should be sent to the webhook
          const webhookFormData = new FormData()
          webhookFormData.append('message', message || '')
          webhookFormData.append('timestamp', timestamp || new Date().toISOString())
          webhookFormData.append('user_id', userId || '')
          webhookFormData.append('first_name', firstName || '')
          webhookFormData.append('last_name', lastName || '')
          webhookFormData.append('dietary_preference', dietaryPreference || '')
          webhookFormData.append('allergies', allergies || '')
          webhookFormData.append('meals_per_day', mealsPerDay || '')
          webhookFormData.append('adults_count', adultsCount || '')
          webhookFormData.append('children_count', childrenCount || '')
          
          console.log('Sending webhook with form data:')
          for (const [key, value] of webhookFormData.entries()) {
            console.log(`  ${key}: ${value}`)
          }
          
          // Use AbortController for timeout control
          const abortController = new AbortController()
          const timeoutId = setTimeout(() => abortController.abort(), 60000) // 60 second timeout
          
          try {
            const response = await fetch('https://pskinnertech.app.n8n.cloud/webhook-test/gale', {
              method: 'POST',
              body: webhookFormData, // Send as FormData, not JSON
              signal: abortController.signal
            })
            
            clearTimeout(timeoutId)
            
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

            // Stream the response word by word
            const words = messageContent.split(' ')
            
            for (let i = 0; i < words.length; i++) {
              const word = words[i]
              controller.enqueue(`data: ${JSON.stringify({ 
                type: 'delta', 
                content: word + ' ',
                isComplete: false 
              })}\n\n`)
              
              // Small delay between words for streaming effect
              if (i < words.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 25))
              }
            }
            
            // Send completion signal
            controller.enqueue(`data: ${JSON.stringify({ 
              type: 'complete',
              isComplete: true 
            })}\n\n`)
            
          } catch (fetchError) {
            clearTimeout(timeoutId)
            console.error('Error calling webhook:', fetchError)
            
            let errorMessage = "Sorry, I'm having trouble connecting right now. Please try again."
            if (fetchError.name === 'AbortError') {
              errorMessage = "The request timed out. Please try again with a shorter message."
            }
            
            controller.enqueue(`data: ${JSON.stringify({ 
              type: 'error', 
              content: errorMessage,
              isComplete: true 
            })}\n\n`)
          }
          
        } catch (streamError) {
          console.error('Error in stream:', streamError)
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'error', 
            content: "An unexpected error occurred. Please try again.",
            isComplete: true 
          })}\n\n`)
        } finally {
          controller.close()
        }
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