import { escapeHtml } from '@vue/shared'
import { generate } from 'astring'
import { klona } from 'klona'
import { walk } from 'svelte/compiler'
import type { Ast } from 'svelte/types/compiler/interfaces'

export class Transformer {
  ast: Ast
  raw: string

  constructor(ast: Ast, raw: string) {
    this.ast = ast
    this.raw = raw
  }

  getTemplate() {
    const raw = this.raw
    let res = '<template>'

    // console.log(JSON.stringify(this.ast.html, undefined, 2))

    walk(this.ast.html, {
      enter(node: any, parent, key, index) {
        if (node.type === 'Text') {
          if (parent?.type === 'Attribute') {
            this.skip()
            return
          }
          res += node.raw
        }
        // {expression} -> {{expression}}
        else if (node.type === 'MustacheTag') {
          if (parent?.type === 'Attribute') {
            this.skip()
            return
          }
          res += `{{${raw.slice(node.expression.start, node.expression.end)}}}`
        }
        // {@html expression} -> <template v-html="expression" />
        else if (node.type === 'RawMustacheTag') {
          res += `<template v-html="${raw.slice(node.expression.start, node.expression.end)}" />`
        }
        else if (node.type === 'Element' || node.type === 'InlineComponent') {
          res += `<${node.name}`

          if (node.attributes?.length) {
            for (const attr of node.attributes) {
              // on:event="value" -> @event="value"
              if (attr.type === 'EventHandler') {
                res += ` @${attr.name}="${raw.slice(attr.expression.start, attr.expression.end)}"`
              }
              // {...props} -> v-bind="props"
              else if (attr.type === 'Spread') {
                res += ` v-bind="${attr.expression.name}"`
              }
              // name={value} -> :name="value"
              else if (attr.value.find((v: any) => v.type === 'MustacheTag')) {
                res += ` :${attr.name}="${
                  attr.value.map((v: any) => {
                    if (v.type === 'Text')
                      return escapeHtml(JSON.stringify(v.raw))
                    else if (v.type === 'MustacheTag')
                      return escapeHtml(raw.slice(v.expression.start, v.expression.end))
                    else return ''
                  }).join('+')}"`
              }
              else {
                res += ` ${attr.name}="${attr.value.map((v: any) => raw.slice(v.start, v.end)).join('')}"`
              }
            }
          }

          if (!node.children?.length)
            res += ' />'
          else
            res += '>'
        }
        // {#if expression} -> <template v-if="expression">
        else if (node.type === 'IfBlock') {
          res += '<template v-if="'

          if (node.expression)
            res += raw.slice(node.expression.start, node.expression.end)

          res += '">'
        }
        // {:else} -> <template v-else>
        else if (node.type === 'ElseBlock') {
          if (key === 'else') {
            if (parent?.type === 'EachBlock')
              res += '</template>'

            res += '</template>'
          }

          res += '<template v-else>'
        }
        // {#each items as item (item.id)} -> <template v-for="item in items" :key="item.id">
        else if (node.type === 'EachBlock') {
          if (node.else)
            res += `<template v-if="${raw.slice(node.expression.start, node.expression.end)}.length>0">`

          res += '<template v-for="'

          if (node.context && node.index)
            res += `(${raw.slice(node.context.start, node.context.end)},${node.index})`
          else if (node.context)
            res += raw.slice(node.context.start, node.context.end)
          else if (node.index)
            res += `(,${node.index})`

          res += ' in '

          if (node.expression)
            res += raw.slice(node.expression.start, node.expression.end)

          res += '"'

          if (node.key)
            res += ` :key="${raw.slice(node.key.start, node.key.end)}"`

          res += '>'
        }
      },
      leave(node: any, parent, key, index) {
        if (node.type === 'Element' || node.type === 'InlineComponent') {
          if (node.children?.length)
            res += `</${node.name}>`
        }
        else if (node.type === 'IfBlock') {
          if (!node.else)
            res += '</template>'
        }
        else if (node.type === 'ElseBlock') {
          res += '</template>'
        }
        else if (node.type === 'EachBlock') {
          if (!node.else)
            res += '</template>'
        }
      },
    })

    return `${res}</template>`
  }

  getScriptSetup() {
    if (!this.ast.instance)
      return ''

    const raw = this.raw
    let content = ''

    // console.log(JSON.stringify(this.ast.instance.content, undefined, 2))

    const importsFromVue = new Set<string>()
    const props = new Set<string>()
    const propDefaults: Record<string, string> = {}
    const emits = new Set<string>()

    let currentContext: {
      refs: string[]
      props: string[]
    } = {
      refs: [],
      props: [],
    }
    const contextStack: typeof currentContext[] = []

    const walkRegularNode = (node: any) => {
      const cloneNode = klona(node)

      walk(cloneNode, {
        enter(node: any, parent, key, index) {
          if (node.type === 'BlockStatement') {
            const newContext = {
              refs: [...currentContext.refs],
              props: [...currentContext.props],
            }
            contextStack.push(currentContext)
            currentContext = newContext
          }
          else if (node.type === 'VariableDeclaration') {
            for (const decl of node.declarations) {
              const name = decl.id.name
              if (currentContext.refs.includes(name))
                currentContext.refs.splice(currentContext.refs.indexOf(name), 1)
              if (currentContext.props.includes(name))
                currentContext.props.splice(currentContext.props.indexOf(name), 1)
            }
          }
          // replace assignments to props with emit
          else if (node.type === 'AssignmentExpression') {
            if (node.left.type === 'Identifier') {
              const name = node.left.name
              if (currentContext.props.includes(name)) {
                // emit('update:<name>', <right>)
                this.replace({
                  type: 'CallExpression',
                  loc: node.loc,
                  callee: {
                    type: 'Identifier',
                    loc: node.left.loc,
                    name: 'emit',
                  },
                  arguments: [
                    {
                      type: 'Literal',
                      loc: node.left.loc,
                      value: `update:${name}`,
                    },
                    node.right,
                  ],
                } as any)
                emits.add(`update:${name}`)
              }
            }
          }
          else if (node.type === 'Identifier') {
            if (key === 'property')
              return
            if (currentContext.refs.includes(node.name)) {
              this.replace({
                type: 'MemberExpression',
                loc: node.loc,
                object: {
                  type: 'Identifier',
                  loc: node.loc,
                  name: node.name,
                },
                property: {
                  type: 'Identifier',
                  name: 'value',
                },
                computed: false,
                optional: false,
              } as any)
              this.skip()
            }
          }
        },
        leave(node: any, parent, key, index) {
          if (node.type === 'BlockStatement')
            currentContext = contextStack.pop()!
        },
      })

      content += generate(cloneNode)
    }

    for (const node of this.ast.instance.content.body as any) {
      // top level variable -> shallowRef
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations) {
          content += `const ${raw.slice(decl.id.start, decl.id.end)} = `
          if (decl.init)
            content += `shallowRef(${raw.slice(decl.init.start, decl.init.end)});\n`
          else
            content += 'shallowRef();\n'
          currentContext.refs.push(decl.id.name)
          importsFromVue.add('shallowRef')
        }
      }
      else if (node.type === 'LabeledStatement' && node.label.name === '$') {
        // $: variable -> shallowRef + watch
        if (node.body.type === 'ExpressionStatement'
         && node.body.expression.type === 'AssignmentExpression'
         && node.body.expression.operator === '=') {
          const expr = node.body.expression
          content += `const ${expr.left.name} = shallowRef();\n`
          currentContext.refs.push(expr.left.name)
          importsFromVue.add('shallowRef')
        }
        // $: block -> watch
        content += 'watch(() => ['
        walk(node, {
          enter(node: any, parent, key, index) {
            if (node.type === 'BlockStatement') {
              const newContext = {
                refs: [...currentContext.refs],
                props: [...currentContext.props],
              }
              contextStack.push(currentContext)
              currentContext = newContext
            }
            else if (node.type === 'VariableDeclaration') {
              for (const decl of node.declarations) {
                const name = decl.id.name
                if (currentContext.refs.includes(name))
                  currentContext.refs.splice(currentContext.refs.indexOf(name), 1)
                else if (currentContext.props.includes(name))
                  currentContext.props.splice(currentContext.props.indexOf(name), 1)
              }
            }
            else if (parent?.type === 'AssignmentExpression' && key === 'left') {
              this.skip()
            }
            else if (node.type === 'Identifier') {
              if (currentContext.refs.includes(node.name))
                content += `${node.name}.value, `
              else if (currentContext.props.includes(node.name))
                content += `${node.name}, `
            }
          },
          leave(node: any, parent, key, index) {
            if (node.type === 'BlockStatement')
              currentContext = contextStack.pop()!
          },
        })
        content += '], () => {\n'
        walkRegularNode(node.body)
        content += '\n}, { immediate: true });\n'
        importsFromVue.add('watch')
      }
      // export variable -> defineProps
      else if (node.type === 'ExportNamedDeclaration') {
        for (const decl of node.declaration.declarations) {
          props.add(decl.id.name)
          currentContext.props.push(decl.id.name)
          if (decl.init)
            propDefaults[decl.id.name] = raw.slice(decl.init.start, decl.init.end)
        }
      }
      else {
        walkRegularNode(node)
      }
    }

    if (emits.size)
      content = `const emit = defineEmits([${[...emits].map(v => JSON.stringify(v)).join(', ')}]);\n${content}`

    if (props.size) {
      let defProps = 'const {\n'
      for (const prop of props) {
        defProps += `  ${prop}`
        if (prop in propDefaults)
          defProps += ` = ${propDefaults[prop]}`

        defProps += ',\n'
      }
      defProps += `} = defineProps([${[...props].map(v => JSON.stringify(v)).join(', ')}]);\n`
      content = `${defProps}${content}`
    }

    if (importsFromVue.size)
      content = `import { ${[...importsFromVue].join(', ')} } from 'vue';\n${content}`

    return `<script setup>\n${content}\n</script>`
  }

  getSFC() {
    return `${this.getScriptSetup()}\n\n${this.getTemplate()}`
  }
}
