<svelte:head>
  <title>PizzaParty · Companion App</title>
  <meta name="description" content="L'app che accompagna il PizzaParty. In costruzione." />
</svelte:head>

<main>
  <p class="etichetta">Companion App</p>
  <h1>Il forno si sta scaldando.</h1>
  <p>L'app del PizzaParty è in costruzione. Ci vediamo in primavera.</p>
</main>

<style>
  main {
    min-height: 100dvh;
    display: grid;
    place-content: center;
    gap: 12px;
    padding: 24px 16px;
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
