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
      import { shallowRef, computed, watch } from 'vue';
      const {
        itemContent = 'item',
      } = defineProps([\\"itemContent\\"]);
      const emit = defineEmits([\\"update:itemContent\\"]);
      const count = shallowRef(0);
      const items = computed(() => itemContent.repeat(count.value));
      watch(() => [count.value, ], () => {
      if (count.value >= 10) {
        alert(\`count is dangerously high!\`);
        count.value = 9;
        emit(\\"update:itemContent\\", 'item2');
      }
      });
      function handleClick() {
        count.value += 1;
      }
      </script>
      
      <template>
      
      <button @click=\\"handleClick\\">
        Clicked {{count}}
        {{count === 1 ? 'time' : 'times'}}
      </button>
      
      <template v-if=\\"count >= 5\\"><p>count is pretty high.</p></template><template v-else><p>count is not so high.</p></template>
      
      <ul>
        <template v-if=\\"items.length>0\\"><template v-for=\\"item in items\\" :key=\\"item\\"><li>{{item}}</li></template></template><template v-else><li>No items</li></template>
      </ul></template>"
    `)
  })
})
