# svelte.vue

[![NPM version](https://img.shields.io/npm/v/svelte.vue?color=a1b858&label=)](https://www.npmjs.com/package/svelte.vue)

> Note: This is very early prototype, expect it to not work on some statements, I'm working on it.

An [unplugin](https://github.com/unjs/unplugin) to convert Svelte components to Vue.

## Usage

Import this as a plugin in your bundler, here is a Vite example.

```js
// vite.config.js
import svelteVue from 'svelte.vue/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    // svelte.vue needs to be placed before vue
    svelteVue(),
    vue(),
  ],
})
```

Then use `[name].svelte.vue` to import Svelte component `[name].svelte` as a Vue component.

```svelte
<!-- HelloWorld.svelte -->
<script>
  export let msg = 'Hello World!'

  $: msg2 = msg.replace('Svelte', 'Vue')
</script>

<h1>{msg}</h1>
<h2>{msg2}</h2>
```

```vue
<!-- App.vue -->
<script setup>
import HelloWorld from './HelloWorld.svelte.vue'
</script>

<template>
  <HelloWorld msg="Hello Svelte!" />
</template>
```
