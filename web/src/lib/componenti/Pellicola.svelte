<script lang="ts">
  // Striscia di pellicola cinematografica (motivo del decennale).
  // Il tema decide se mostrarla (--pellicola: flex | none) e di che colori.
  // Con «scorre» i fori scorrono verso destra (animazione CSS; con «riduci movimento» si fermano).
  import type { Snippet } from 'svelte';

  let { children, scorre = false }: { children?: Snippet; scorre?: boolean } = $props();
</script>

<div class="pellicola" class:scorre aria-hidden={children ? undefined : 'true'}>
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
  .scorre .fori {
    animation: scorrimento-fori 400ms linear infinite;
  }
  /* Il motivo si ripete ogni 22px: a 22px il ciclo torna su se stesso, senza salti. */
  @keyframes scorrimento-fori {
    from {
      background-position-x: 0;
    }
    to {
      background-position-x: 22px;
    }
  }
  .fotogrammi {
    display: flex;
    gap: var(--spazio-2);
    min-height: 8px;
  }
</style>
