<script lang="ts">
  // Striscia di pellicola cinematografica (motivo del decennale).
  // Il tema decide se mostrarla (--pellicola: flex | none) e di che colori.
  import type { Snippet } from 'svelte';

  let { children }: { children?: Snippet } = $props();
</script>

<div class="pellicola" aria-hidden={children ? undefined : 'true'}>
  <span class="fori"></span>
  <div class="fotogrammi">{@render children?.()}</div>
  <span class="fori"></span>
</div>

<style>
  .pellicola {
    display: var(--pellicola);
    flex-direction: column;
    background: var(--pellicola-colore);
    border-radius: var(--raggio-s);
    padding: 0 var(--spazio-2);
  }
  .fori {
    height: 14px;
    background: repeating-linear-gradient(
      90deg,
      transparent 0 6px,
      var(--pellicola-fori) 6px 16px,
      transparent 16px 22px
    );
    background-size: 22px 8px;
    background-repeat: repeat-x;
    background-position: 0 center;
  }
  .fotogrammi {
    display: flex;
    gap: var(--spazio-2);
    min-height: 8px;
  }
</style>
