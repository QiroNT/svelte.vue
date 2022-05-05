<script lang="ts" setup>
// @ts-expect-error missing types
import { Pane, Splitpanes } from 'splitpanes'
import { compile } from 'svelte/compiler'
import { computed, ref } from 'vue'
import { Transformer } from '../../src/transformer'
import CodeMirror from './components/CodeMirror.vue'

const input = ref('')
const output = computed(() => {
  const { ast } = compile(input.value, { generate: false })
  const t = new Transformer(ast, input.value)
  return t.getSFC()
})
</script>

<template>
  <Splitpanes ref="panel" class="flex flex-row h-screen">
    <Pane class="flex flex-col">
      <CodeMirror v-model="input" mode="htmlmixed" class="flex-auto scrolls border-(r gray-400/20)" />
    </Pane>
    <Pane class="flex flex-col">
      <CodeMirror v-model="output" mode="htmlmixed" class="flex-auto scrolls border-(l gray-400/20)" :read-only="true" />
    </Pane>
  </Splitpanes>
</template>
