<script lang="ts">
  import { AVATAR } from '$lib/account/avatar';
  import ImmagineAvatar from './ImmagineAvatar.svelte';

  let { valore = $bindable() }: { valore: string } = $props();
</script>

<fieldset>
  <legend>Scegli il tuo avatar</legend>
  <div class="griglia">
    {#each AVATAR as avatar (avatar.id)}
      <label class:scelto={valore === avatar.id}>
        <input type="radio" name="avatar" value={avatar.id} bind:group={valore} />
        <ImmagineAvatar id={avatar.id} dimensione={52} />
        <span>{avatar.nome}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }
  legend {
    font-size: var(--testo-s);
    color: var(--colore-testo-attenuato);
    margin-bottom: var(--spazio-2);
  }
  .griglia {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spazio-2);
  }
  label {
    display: grid;
    justify-items: center;
    gap: var(--spazio-1);
    padding: var(--spazio-2) var(--spazio-1);
    border-radius: var(--raggio-m);
    font-size: 0.65rem;
    text-align: center;
    color: var(--colore-testo-attenuato);
    cursor: pointer;
  }
  label.scelto {
    background: var(--colore-superficie);
    box-shadow: inset 0 0 0 2px var(--colore-accento);
    color: var(--colore-testo);
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  label:has(input:focus-visible) {
    outline: 2px solid var(--colore-accento);
  }
</style>
