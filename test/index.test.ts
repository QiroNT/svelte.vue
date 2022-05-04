import { readFile } from 'fs/promises'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { compile } from 'svelte/compiler'
import { Transformer } from '../src/transformer'

describe('index', () => {
  it('hi vitest', async () => {
    const raw = await readFile(join(__dirname, './fixtures/test.svelte'), 'utf-8')
    const { ast } = compile(raw, { generate: false })

    const t = new Transformer(ast, raw)

    expect(t.getSFC()).toMatchInlineSnapshot(`
      "<script setup>
      import { shallowRef } from 'vue';
      const count = shallowRef(0);
      function handleClick() {
        count.value += 1;
      }
      </script>
      
      <template>
      
      <button @click=\\"handleClick\\">
        Clicked {{count}} {{count === 1 ? 'time' : 'times'}}
      </button></template>"
    `)
  })
})
