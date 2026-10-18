<script lang="ts">
  import { resolve } from '$app/paths';
  import { VERSIONE } from '$lib/versione';
</script>

<p class="versione">
  <a href={resolve('/informazioni')}>PizzaParty v{VERSIONE} · Novità e informazioni</a>
</p>

<style>
  .versione {
    margin: var(--spazio-6) 0 0;
    text-align: center;
    font-size: var(--testo-s);
  }
  a {
    color: var(--colore-testo-attenuato);
  }
</style>
