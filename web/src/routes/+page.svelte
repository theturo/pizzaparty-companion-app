<svelte:head>
  <title>PizzaParty</title>
  <meta name="description" content="L'app che accompagna il PizzaParty. In costruzione." />
</svelte:head>

<section>
  <p class="etichetta">Companion App</p>
  <h1>Il forno si sta scaldando.</h1>
  <p>Qui arriveranno il countdown alla prossima edizione e il check-in della serata. Ci vediamo in primavera.</p>
</section>

<style>
  section {
    min-height: 60dvh;
    display: grid;
    place-content: center;
    gap: 12px;
    text-align: center;
  }
  .etichetta {
    margin: 0;
    font-family: 'Kalam', cursive;
    font-weight: 700;
    color: var(--gold);
  }
  h1 {
    margin: 0;
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 800;
    font-size: clamp(2rem, 8vw, 3.5rem);
    line-height: 1.1;
  }
  p {
    margin: 0;
    color: var(--parchment-dim);
  }
</style>
