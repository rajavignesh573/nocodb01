import { ref, computed } from 'vue'
import { useGlobal } from './useGlobal'
import { useAiAuth } from './useAiAuth'

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatConversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export const useChat = () => {
  const { $api } = useGlobal()
  const { getAuthHeaders } = useAiAuth()

  const messages = ref<ChatMessage[]>([])
  const conversations = ref<ChatConversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const canSendMessage = computed(() => {
    return messages.value.length === 0 || 
           (messages.value[messages.value.length - 1]?.role === 'assistant' && !isLoading.value)
  })

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading.value) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    messages.value.push(userMessage)
    isLoading.value = true
    error.value = null

    try {
      const requestBody: any = {
        message: content.trim(),
        model: 'gpt-4o-mini'
      }
      
      // Only include conversationId if it exists
      if (currentConversationId.value) {
        requestBody.conversationId = currentConversationId.value
      }

      const response = await fetch('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      // Add assistant message placeholder
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
      messages.value.push(assistantMessage)

      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        console.log('Raw chunk received:', chunk)
        const lines = chunk.split('\n')

        for (const line of lines) {
          console.log('Processing line:', line)
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            console.log('Data extracted:', data)
            
            if (data === '[DONE]') {
              console.log('Stream completed')
              // Extract conversation ID from response headers
              const conversationIdHeader = response.headers.get('x-conversation-id')
              if (conversationIdHeader) {
                currentConversationId.value = conversationIdHeader
                console.log('Conversation ID set:', conversationIdHeader)
              }
              break
            }

            try {
              const parsed = JSON.parse(data)
              console.log('Parsed data:', parsed)
              if (parsed.text) {
                fullResponse += parsed.text
                assistantMessage.content = fullResponse
                console.log('Updated assistant message:', assistantMessage.content)
              }
            } catch (e) {
              console.log('JSON parse error for line:', data, e)
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      }

    } catch (err) {
      console.error('Error sending message:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      
      // Add error message
      messages.value.push({
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date()
      })
    } finally {
      isLoading.value = false
    }
  }

  const loadConversations = async () => {
    try {
      const response = await $api.get('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/conversations', {
        headers: getAuthHeaders()
      })
      
      if (response.data?.list) {
        conversations.value = response.data.list
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
      error.value = 'Failed to load conversations'
    }
  }

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await $api.get(`http://localhost:8080/api/v1/db/data/v1/noco/default/ai/conversations/${conversationId}/messages`, {
        headers: getAuthHeaders()
      })
      
      if (response.data?.list) {
        messages.value = response.data.list.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: JSON.parse(msg.content_json).text,
          timestamp: new Date(msg.created_at)
        }))
        currentConversationId.value = conversationId
      }
    } catch (err) {
      console.error('Error loading conversation:', err)
      error.value = 'Failed to load conversation'
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      await $api.delete(`http://localhost:8080/api/v1/db/data/v1/noco/default/ai/conversations/${conversationId}`, {
        headers: getAuthHeaders()
      })
      
      // Remove from conversations list
      conversations.value = conversations.value.filter(conv => conv.id !== conversationId)
      
      // Clear messages if this was the current conversation
      if (currentConversationId.value === conversationId) {
        messages.value = []
        currentConversationId.value = null
      }
    } catch (err) {
      console.error('Error deleting conversation:', err)
      error.value = 'Failed to delete conversation'
    }
  }

  const clearMessages = () => {
    messages.value = []
    currentConversationId.value = null
    error.value = null
  }

  const healthCheck = async () => {
    try {
      const response = await $api.get('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/health', {
        headers: getAuthHeaders()
      })
      return response.data
    } catch (err) {
      console.error('Health check failed:', err)
      return null
    }
  }

  return {
    // State
    messages: readonly(messages),
    conversations: readonly(conversations),
    currentConversationId: readonly(currentConversationId),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    canSendMessage,
    
    // Methods
    sendMessage,
    loadConversations,
    loadConversation,
    deleteConversation,
    clearMessages,
    healthCheck
  }
}
