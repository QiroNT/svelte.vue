import { createUnplugin } from 'unplugin'
import type { Options } from './types'

export default createUnplugin<Options>(options => ({
  name: 'svelte.vue',
}))
