<script setup lang="ts">
import { ref } from 'vue'
import LinksManagerView from './LinksManagerView.vue'

const tab = ref<'links'>('links')
const loggingOut = ref(false)

const logout = async () => {
  loggingOut.value = true
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Best-effort logout, redirect regardless
  }
  window.location.href = '/admin/login'
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <!-- Header -->
    <header class="bg-gray-800/80 backdrop-blur border-b border-white/10 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold text-white">Admin Dashboard</h1>
          <a href="/" class="text-sm text-gray-400 hover:text-white transition-colors">&larr; Back to site</a>
        </div>
        <button
          @click="logout"
          :disabled="loggingOut"
          class="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loggingOut ? 'Logging out...' : 'Logout' }}
        </button>
      </div>
    </header>

    <!-- Tab Navigation -->
    <nav class="bg-gray-800/40 border-b border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex gap-1">
          <button
            :class="[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === 'links'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
            ]"
            @click="tab = 'links'"
          >
            Links
          </button>
          <!-- Add more tabs here as needed -->
        </div>
      </div>
    </nav>

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <LinksManagerView v-if="tab === 'links'" />
    </main>
  </div>
</template>
