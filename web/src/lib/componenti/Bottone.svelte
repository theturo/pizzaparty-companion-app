<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    variante = 'primario',
    children,
    ...attributi
  }: { variante?: 'primario' | 'secondario'; children: Snippet } & HTMLButtonAttributes = $props();
</script>

<button class={variante} {...attributi}>{@render children()}</button>

<style>
  button {
    border: 0;
    border-radius: var(--raggio-s);
    padding: var(--spazio-2) var(--spazio-4);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: filter var(--durata-breve);
  }
  button:hover {
    filter: brightness(1.08);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .primario {
    background: var(--colore-accento);
    color: var(--colore-sul-accento);
  }
  .secondario {
    background: var(--colore-sfondo-2);
    color: var(--colore-testo);
    box-shadow: inset 0 0 0 1px var(--colore-accento-scuro);
  }
</style>
