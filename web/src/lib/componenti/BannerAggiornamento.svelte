<script lang="ts">
  import { fly } from 'svelte/transition';
  import { pwa, aggiorna } from '$lib/pwa/aggiornamenti.svelte';
</script>

{#if pwa.nuovaVersione}
  <div class="banner" role="status" transition:fly={{ y: 24, duration: 250 }}>
    <span>È disponibile una nuova versione.</span>
    <button onclick={aggiorna}>Aggiorna</button>
  </div>
{/if}

<style>
  .banner {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(72px + env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px 10px 16px;
    background: var(--card);
    border: 1px solid var(--gold-dark);
    border-radius: 12px;
    z-index: 20;
  }
  button {
    background: var(--gold);
    color: var(--bg);
    border: 0;
    border-radius: 8px;
    padding: 8px 14px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
</style>
