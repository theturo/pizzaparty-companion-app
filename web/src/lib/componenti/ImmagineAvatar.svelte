<script lang="ts">
  import { AVATAR, immagineAvatar } from '$lib/account/avatar';

  let { id, dimensione = 48 }: { id: string; dimensione?: number } = $props();
  const avatar = $derived(AVATAR.find((a) => a.id === id) ?? AVATAR[0]);
</script>

<!-- Immagini statiche dipinte (web/static/avatar): il cerchio colorato le fa da sfondo. -->
<span
  class="avatar"
  style:width="{dimensione}px"
  style:height="{dimensione}px"
  style:background={avatar.sfondo}
>
  <img
    src={immagineAvatar(avatar.id)}
    alt={avatar.nome}
    width={dimensione}
    height={dimensione}
    decoding="async"
    draggable="false"
  />
</span>

<style>
  .avatar {
    display: block;
    flex: none;
    border-radius: 50%;
    overflow: hidden;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
