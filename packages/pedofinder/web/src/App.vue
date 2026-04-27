<template>
  <div id="app">
    <nav class="navbar">
      <div class="container">
        <div class="navbar-content">
          <router-link to="/" class="navbar-brand">
            Pedofinder
          </router-link>
          <ul class="navbar-links">
            <li>
              <router-link
                to="/"
                class="navbar-link"
                :class="{ active: $route.name === 'Home' }"
              >
                Search
              </router-link>
            </li>
            <li>
              <router-link
                to="/graph"
                class="navbar-link"
                :class="{ active: $route.name === 'Graph' }"
              >
                Network Graph
              </router-link>
            </li>
            <li>
              <router-link
                to="/statistics"
                class="navbar-link"
                :class="{ active: $route.name === 'Statistics' }"
              >
                Statistics
              </router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// No additional setup needed
</script>

<style>
@import './styles/main.css';
</style>
