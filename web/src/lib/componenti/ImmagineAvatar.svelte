<script lang="ts">
  import { AVATAR } from '$lib/account/avatar';

  let { id, dimensione = 48 }: { id: string; dimensione?: number } = $props();
  const avatar = $derived(AVATAR.find((a) => a.id === id) ?? AVATAR[0]);
</script>

<!-- Gli SVG sono costanti scritte da noi (avatar.ts), non contenuto degli utenti. -->
<svg viewBox="0 0 64 64" width={dimensione} height={dimensione} role="img" aria-label={avatar.nome}>
  <circle cx="32" cy="32" r="32" fill={avatar.sfondo} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html avatar.svg}
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
