<script lang="ts">
  // Icone della barra disegnate per il PizzaParty (D-052): tratto come Lucide, colore dal testo.
  type Nome = 'forno' | 'trofeo' | 'fotocamera' | 'fetta' | 'profilo';

  let { nome, spessore }: { nome: Nome; spessore: number } = $props();
</script>

<svg
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={spessore}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if nome === 'forno'}
    <path d="M2 20h20" />
    <path d="M4 20v-6a8 8 0 0 1 16 0v6" />
    <path d="M9 20v-3a3 3 0 0 1 6 0v3" />
    <path d="M15 6.6V3h3v5.7" />
  {:else if nome === 'trofeo'}
    <path d="M6 3h12v6a6 6 0 0 1-12 0z" />
    <path d="M6 5H4.5a2.5 2.5 0 0 0 0 5H6.4" />
    <path d="M18 5h1.5a2.5 2.5 0 0 1 0 5h-1.9" />
    <path d="M12 15v3" />
    <path d="M8 21h8l-1-3H9z" />
    <path d="M10 7h4l-2 3.5z" />
  {:else if nome === 'fotocamera'}
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="4" />
    <path d="M12 9v8" />
    <path d="M8 13h8" />
  {:else if nome === 'fetta'}
    <path d="M3 5a21 21 0 0 1 18 0" />
    <path d="M3 5l9 16 9-16" />
    <path d="M4.4 7.5a18 18 0 0 1 15.2 0" />
    <path d="M10 11h.01" />
    <path d="M14 11.5h.01" />
    <path d="M12 15.5h.01" />
  {:else if nome === 'profilo'}
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <path d="M8 7a4 4 0 0 1 8 0" />
    <path d="M4.5 7H16" />
    <path d="M8 7v1a4 4 0 0 0 8 0V7" />
  {/if}
</svg>
