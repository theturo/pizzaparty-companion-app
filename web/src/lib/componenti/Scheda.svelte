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
    animation: comparsa-scheda var(--durata-media) var(--curva-uscita) both;
  }
  /* Compare dal basso e dissolvendosi, una volta sola (D-048). */
  @keyframes comparsa-scheda {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
