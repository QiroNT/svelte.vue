import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { compile } from 'svelte/compiler'
import { createUnplugin } from 'unplugin'
import { Transformer } from './transformer'
import type { Options } from './types'

export default createUnplugin<Options>((options) => {
  return {
    name: 'svelte.vue',
    resolveId(id, importer) {
      if (!importer)
        return null
      if (id.match(/\.svelte\.vue$/)) {
        const dist = join(dirname(importer), id)
        return dist
      }
    },
    async load(id) {
      if (id.match(/\.svelte\.vue$/)) {
        const file = id.replace(/\.svelte\.vue$/, '.svelte')
        const raw = await readFile(file, 'utf-8').catch(() => undefined)
        if (!raw)
          return
        this.addWatchFile(file)
        const { ast } = compile(raw, {
          ...options?.svelte?.compilerOptions || {},
          generate: false,
        })
        const t = new Transformer(ast, raw)
        return t.getSFC()
      }
    },
  }
})
