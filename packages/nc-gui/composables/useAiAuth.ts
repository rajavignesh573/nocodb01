import { computed } from 'vue'
import { useGlobal } from '~/composables/useGlobal'

export function useAiAuth() {
  const { token, user, $api } = useGlobal()

  const getAuthHeaders = () => {
    return token.value ? { 'xc-auth': token.value } : {}
  }

  const isAuthenticated = computed(() => !!token.value)

  const hasAiPermission = computed(() => {
    if (!user.value) return false
    
    // Check if user has AI assistant permission
    return user.value.roles?.workspaceChat === true || user.value.roles?.['*'] === true
  })

  const checkAiAccess = async () => {
    try {
      const response = await $api.get('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/health', {
        headers: getAuthHeaders()
      })
      return response.status === 200
    } catch (error) {
      console.error('AI access check failed:', error)
      return false
    }
  }

  return {
    getAuthHeaders,
    isAuthenticated,
    hasAiPermission,
    checkAiAccess
  }
}
