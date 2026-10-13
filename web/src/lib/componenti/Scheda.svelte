<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="scheda">{@render children()}</div>

<style>
  .scheda {
    background: var(--colore-superficie);
    border-radius: var(--raggio-m);
    padding: var(--spazio-4);
    display: grid;
    gap: var(--spazio-2);
  }
</style>
