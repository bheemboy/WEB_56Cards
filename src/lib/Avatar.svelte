<script lang="ts">
    const { team = 0, scale = 8 } = $props<{team?: number, scale?: number}>();
    
    let windowHeight = $state(0);
    const image_url = $derived(`/images/person-${team === 0 ? 'blue' : 'red'}.png`);
    const avatar_size = $derived(Math.max(50, ((windowHeight ?? 0) * scale / 100)));
</script>

<svelte:window bind:innerHeight={windowHeight} />

<div 
    class="avatar"
    style="--avatar-size: {avatar_size}px; --image-url: url('{image_url}');"
    aria-label={`${team === 0 ? 'Blue' : 'Red'} team player avatar`}>
</div>

<style>
    .avatar {
        height: var(--avatar-size);
        aspect-ratio: 1;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        background-image: var(--image-url);
    }
</style>
