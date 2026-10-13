<script lang="ts">
  // Mascotte del PizzaParty. SEGNAPOSTO: sagoma ripresa dalle bozze del decennale (2026);
  // il disegno definitivo e le pose nasceranno nella sessione grafica.
  // I colori arrivano dal tema (--dino-pelle, --dino-dettagli).
  let {
    larghezza = 160,
    verso = 'sinistra',
    cappellino = false,
    etichetta = 'Il dinosauro del PizzaParty',
  }: {
    larghezza?: number;
    verso?: 'sinistra' | 'destra';
    cappellino?: boolean;
    etichetta?: string;
  } = $props();
</script>

<svg viewBox="30 -210 295 215" width={larghezza} role="img" aria-label={etichetta}>
  <g transform={verso === 'destra' ? 'translate(355 0) scale(-1 1)' : undefined}>
    <g class="pelle">
      <rect x="62" y="-38" width="15" height="38" rx="6" />
      <rect x="88" y="-40" width="15" height="40" rx="6" />
      <rect x="150" y="-40" width="16" height="40" rx="6" />
      <rect x="176" y="-38" width="16" height="38" rx="6" />
      <ellipse cx="128" cy="-64" rx="62" ry="32" />
      <circle cx="166" cy="-62" r="34" />
      <circle cx="92" cy="-64" r="26" />
      <path d="M96,-78 C 74,-96 60,-118 54,-150 C 51,-166 64,-174 77,-168 C 88,-163 85,-146 88,-128 C 91,-104 104,-92 114,-80 Z" />
      <ellipse cx="60" cy="-160" rx="17" ry="12" />
      <ellipse cx="44" cy="-157" rx="9" ry="7" />
      <path d="M198,-66 C 236,-70 280,-44 316,-4 C 312,-2 306,-2 302,-3 C 272,-34 232,-52 196,-48 Z" />
    </g>
    <circle class="occhio" cx="52" cy="-162" r="2.6" />
    {#if cappellino}
      <path class="dettagli" d="M49,-169 L71,-171 L57,-204 Z" />
      <circle class="pompon" cx="57" cy="-205" r="4.5" />
    {/if}
  </g>
</svg>

<style>
  svg {
    display: block;
    max-width: 100%;
    height: auto;
  }
  .pelle {
    fill: var(--dino-pelle);
  }
  .occhio {
    fill: var(--colore-sfondo);
  }
  .dettagli {
    fill: var(--dino-dettagli);
  }
  .pompon {
    fill: var(--colore-secondario);
  }
</style>
