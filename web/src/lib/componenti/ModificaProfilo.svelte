<script lang="ts">
  // Modifica di nome e avatar (le regole permettono solo questi due campi).
  import Bottone from './Bottone.svelte';
  import SceltaAvatar from './SceltaAvatar.svelte';
  import { controllaNome, NOME_MAX, type Profilo } from '$lib/account/profilo';
  import { messaggioErrore } from '$lib/account/errori';

  let { profilo, chiudi }: { profilo: Profilo; chiudi: () => void } = $props();
  // svelte-ignore state_referenced_locally
  let nome = $state(profilo.nome);
  // svelte-ignore state_referenced_locally
  let avatar = $state(profilo.avatar);
  let errore = $state('');
  let inCorso = $state(false);

  async function salva(evento: SubmitEvent) {
    evento.preventDefault();
    errore = controllaNome(nome) ?? '';
    if (errore) return;
    inCorso = true;
    try {
      const { modificaProfilo } = await import('$lib/account/azioni');
      await modificaProfilo({ nome, avatar });
      chiudi();
    } catch (e) {
      errore = messaggioErrore(e);
    } finally {
      inCorso = false;
    }
  }
</script>

<form class="modulo" onsubmit={salva}>
  <label class="campo">
    <span>Nome</span>
    <input bind:value={nome} required maxlength={NOME_MAX} autocomplete="name" />
  </label>
  <SceltaAvatar bind:valore={avatar} />
  {#if errore}<p class="messaggio-errore" role="alert">{errore}</p>{/if}
  <div class="azioni">
    <Bottone type="button" variante="secondario" onclick={chiudi}>Annulla</Bottone>
    <Bottone type="submit" disabled={inCorso}>Salva</Bottone>
  </div>
</form>

<style>
  .azioni {
    display: flex;
    gap: var(--spazio-2);
    justify-content: flex-end;
  }
</style>
