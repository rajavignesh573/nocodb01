<script lang="ts" setup>
import { useTitle } from '@vueuse/core'
import { ref } from 'vue'
import { useChat } from '~/composables/useChat'

const { isUIAllowed } = useRoles()

const { hideSidebar, isNewSidebarEnabled } = storeToRefs(useSidebarStore())

const workspaceStore = useWorkspace()

const { loadRoles } = useRoles()
const { activeWorkspace: _activeWorkspace } = storeToRefs(workspaceStore)
const { loadCollaborators } = workspaceStore

const currentWorkspace = computedAsync(async () => {
  await loadRoles(undefined, {}, _activeWorkspace.value?.id)
  return _activeWorkspace.value
})

// Use the chat composable
const {
  messages,
  conversations,
  currentConversationId,
  isLoading,
  error,
  canSendMessage,
  sendMessage,
  loadConversations,
  loadConversation,
  deleteConversation,
  clearMessages,
  healthCheck
} = useChat()

// Local state for input
const inputMessage = ref('')

// Methods
const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || !canSendMessage.value) return
  
  const message = inputMessage.value.trim()
  inputMessage.value = ''
  await sendMessage(message)
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}

const handleNewConversation = () => {
  clearMessages()
}

const handleSelectConversation = async (conversationId: string) => {
  await loadConversation(conversationId)
}

const handleDeleteConversation = async (conversationId: string) => {
  await deleteConversation(conversationId)
}

watch(
  () => currentWorkspace.value?.title,
  (title) => {
    if (!title) return

    const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1)

    useTitle(capitalizedTitle)
  },
  {
    immediate: true,
  },
)

onMounted(async () => {
  if (isNewSidebarEnabled.value) {
    hideSidebar.value = true
  }

  until(() => currentWorkspace.value?.id)
    .toMatch((v) => !!v)
    .then(async () => {
      await loadCollaborators({ includeDeleted: true }, currentWorkspace.value!.id)
      await loadConversations()
      await healthCheck()
    })
})

onBeforeMount(() => {
  hideSidebar.value = false
})
</script>

<template>
  <div v-if="currentWorkspace" class="flex w-full flex-col nc-workspace-chat">
    <div class="flex gap-2 items-center min-w-0 p-2 h-[var(--topbar-height)] border-b-1 border-gray-200">
      <GeneralOpenLeftSidebarBtn v-if="!isNewSidebarEnabled" />

      <div class="flex-1 nc-breadcrumb nc-no-negative-margin pl-1">
        <div class="nc-breadcrumb-item capitalize">
          {{ currentWorkspace?.title }}
        </div>
        <GeneralIcon icon="ncSlash1" class="nc-breadcrumb-divider" />
        <h1 class="nc-breadcrumb-item active">
          {{ $t('general.chat') }}
        </h1>
      </div>

      <SmartsheetTopbarCmdK v-if="!isNewSidebarEnabled" />
    </div>
    
    <div class="flex-1 flex">
      <!-- Sidebar for conversations -->
      <div class="w-64 border-r border-gray-200 bg-gray-50">
        <div class="p-4 border-b border-gray-200">
          <button
            @click="handleNewConversation"
            class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <GeneralIcon icon="plus" class="h-4 w-4 inline mr-2" />
            New Chat
          </button>
        </div>
        
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Conversations</h3>
          <div class="space-y-2">
            <div
              v-for="conversation in conversations"
              :key="conversation.id"
              @click="handleSelectConversation(conversation.id)"
              :class="[
                'p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors',
                currentConversationId === conversation.id ? 'bg-blue-100 border border-blue-200' : ''
              ]"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ conversation.title }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ new Date(conversation.updated_at).toLocaleDateString() }}
                  </p>
                </div>
                <button
                  @click.stop="handleDeleteConversation(conversation.id)"
                  class="text-gray-400 hover:text-red-500 ml-2"
                >
                  <GeneralIcon icon="trash" class="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Main chat area -->
      <div class="flex-1 flex flex-col">
        <!-- Error display -->
        <div v-if="error" class="p-4 bg-red-50 border-b border-red-200">
          <div class="flex items-center">
            <GeneralIcon icon="alertCircle" class="h-4 w-4 text-red-500 mr-2" />
            <span class="text-sm text-red-700">{{ error }}</span>
          </div>
        </div>
        
        <!-- Chat Messages Area -->
        <div class="flex-1 p-4 overflow-y-auto">
          <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-lg border border-gray-200 min-h-[500px] flex flex-col">
              <!-- Messages Container -->
              <div class="flex-1 p-4 overflow-y-auto space-y-4">
                <div v-if="messages.length === 0" class="text-center py-8">
                  <GeneralIcon icon="messageCircle" class="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h2 class="text-xl font-semibold text-gray-900 mb-2">
                    {{ $t('general.chat') }}
                  </h2>
                  <p class="text-gray-600">
                    {{ $t('msg.chatDescription') || 'Start a conversation with AI assistant powered by Vercel AI SDK.' }}
                  </p>
                </div>
                
                <div v-for="(message, index) in messages" :key="index" class="flex">
                  <div 
                    :class="[
                      'max-w-[80%] rounded-lg p-3',
                      message.role === 'user' 
                        ? 'ml-auto bg-blue-500 text-white' 
                        : 'mr-auto bg-gray-100 text-gray-900'
                    ]"
                  >
                    <div class="whitespace-pre-wrap">{{ message.content }}</div>
                    <div 
                      :class="[
                        'text-xs mt-1',
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      ]"
                    >
                      {{ message.timestamp.toLocaleTimeString() }}
                    </div>
                  </div>
                </div>
                
                <!-- Loading indicator -->
                <div v-if="isLoading" class="flex">
                  <div class="mr-auto bg-gray-100 text-gray-900 max-w-[80%] rounded-lg p-3">
                    <div class="flex items-center space-x-2">
                      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span class="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Input Area -->
              <div class="border-t border-gray-200 p-4">
                <div class="flex space-x-2">
                  <textarea
                    v-model="inputMessage"
                    @keydown="handleKeyPress"
                    :disabled="!canSendMessage"
                    placeholder="Type your message..."
                    class="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    rows="3"
                  ></textarea>
                  <button
                    @click="handleSendMessage"
                    :disabled="!canSendMessage || !inputMessage.trim()"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <GeneralIcon icon="send" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nc-workspace-avatar {
  @apply min-w-6 h-6 rounded-[6px] flex items-center justify-center text-white font-weight-bold uppercase;
  font-size: 0.7rem;
}

.tab {
  @apply flex flex-row items-center gap-x-2;
}

:deep(.ant-tabs-nav) {
  @apply !pl-0;
}
:deep(.ant-tabs-tab) {
  @apply pt-2 pb-3;
}

.ant-tabs-content-top {
  @apply !h-full;
}
.tab-info {
  @apply flex pl-1.25 px-1.5 py-0.75 rounded-md text-xs;
}
.tab-title {
  @apply flex flex-row items-center gap-x-2 py-[1px];
}
</style>
