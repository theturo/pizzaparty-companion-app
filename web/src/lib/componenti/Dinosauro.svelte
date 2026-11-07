<script lang="ts">
  // Mascotte del PizzaParty: quattro pose dipinte (WebP, 360 e 720 px), il dinosauro guarda a sinistra.
  // I gesti sono animazioni CSS: con «riduci movimento» si fermano da sole (regola globale in base.css).
  import { asset } from '$app/paths';

  let {
    posa = 'aspetta',
    larghezza = 160,
    verso = 'sinistra',
    etichetta = 'Il dinosauro del PizzaParty',
    animato = true,
  }: {
    posa?: 'aspetta' | 'saluta' | 'festeggia' | 'corre';
    larghezza?: number;
    verso?: 'sinistra' | 'destra';
    etichetta?: string;
    animato?: boolean;
  } = $props();

  const base = $derived(asset(`/dinosauro/${posa}`));
  // Stesso rapporto delle immagini: 360 × 318.
  const altezza = $derived(Math.round((larghezza * 318) / 360));
</script>

<!-- Lo specchio sta sul contenitore, il gesto sull'immagine: così le due trasformazioni non si annullano. -->
<div class="specchio" class:destra={verso === 'destra'}>
  <img
    class="posa {posa}"
    class:animato
    src="{base}-360.webp"
    srcset="{base}-360.webp 360w, {base}-720.webp 720w"
    sizes="{larghezza}px"
    width={larghezza}
    height={altezza}
    alt={etichetta}
    decoding="async"
  />
</div>

<style>
  .specchio {
    display: block;
    width: max-content;
    max-width: 100%;
  }
  .specchio.destra {
    transform: scaleX(-1);
  }
  img {
    display: block;
    max-width: 100%;
    height: auto;
    /* I gesti partono dai piedi. */
    transform-origin: 50% 100%;
  }

  /* Saluta: dondola due volte, dopo un attimo. */
  .animato.saluta {
    animation: dondolio 1.2s ease-in-out 300ms 2 backwards;
  }
  /* Festeggia: un saltello, dopo un attimo. */
  .animato.festeggia {
    animation: saltello 600ms var(--curva-uscita) 300ms 1 backwards;
  }
  /* Aspetta: respira piano, senza fermarsi. */
  .animato.aspetta {
    animation: respiro 3s ease-in-out infinite alternate;
  }
  /* Corre: sul posto, con il passo. */
  .animato.corre {
    animation: corsa 400ms ease-in-out infinite alternate;
  }

  /* Nomi globali: sono quelli che l'app e i test riconoscono nel browser. */
  @keyframes -global-dondolio {
    0%,
    100% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(3deg);
    }
    75% {
      transform: rotate(-3deg);
    }
  }
  @keyframes -global-saltello {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8%);
    }
  }
  @keyframes -global-respiro {
    from {
      transform: scaleY(1);
    }
    to {
      transform: scaleY(1.015);
    }
  }
  @keyframes -global-corsa {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-4%);
    }
  }
</style>
