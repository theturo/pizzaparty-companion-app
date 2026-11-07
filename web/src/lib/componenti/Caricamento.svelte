<script lang="ts">
  // Schermata di caricamento: il dinosauro corre sulla pellicola che scorre.
  // Compare dopo 300 ms (animazione CSS, nessun timer): un caricamento veloce non fa lampeggiare nulla.
  import Dinosauro from './Dinosauro.svelte';
  import Pellicola from './Pellicola.svelte';
</script>

<div class="caricamento" role="status" aria-label="Caricamento in corso">
  <Dinosauro posa="corre" larghezza={150} etichetta="" />
  <div class="striscia">
    <Pellicola scorre />
  </div>
</div>

<style>
  .caricamento {
    min-height: 60dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spazio-3);
    /* Invisibile per 300 ms, poi compare: la dissolvenza parte dopo il ritardo. */
    animation: comparsa-caricamento var(--durata-media) var(--curva-uscita) 300ms backwards;
  }
  .striscia {
    width: min(20rem, 100%);
  }
  @keyframes comparsa-caricamento {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
