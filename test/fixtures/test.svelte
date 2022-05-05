<script>
  export const itemContent = 'item'

  let count = 0

  $: items = itemContent.repeat(count)

  $: if (count >= 10) {
    alert(`count is dangerously high!`)
    count = 9
  }

  function handleClick() {
    count += 1
  }
</script>

<button on:click={handleClick}>
  Clicked {count}
  {count === 1 ? 'time' : 'times'}
</button>

{#if count >= 5}
  <p>count is pretty high.</p>
{:else}
  <p>count is not so high.</p>
{/if}

<ul>
  {#each items as item (item)}
    <li>{item}</li>
  {:else}
    <li>No items</li>
  {/each}
</ul>
