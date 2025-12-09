<script lang="ts">
  import { setContext } from 'svelte';
  import Home from "./routes/Home.svelte";
  import Table from "./routes/Table.svelte";
  import { gameControllerInstance, gameControllerContextKey } from './lib/GameController.svelte';
  import { alertStoreInstance, alertContextKey } from './lib/AlertStore.svelte';
  import Alert from './lib/Alert.svelte';
  import { setDeckCardHeight } from './lib/CardHeight.svelte';

  setDeckCardHeight(0);

  // Set the alert context with the singleton instance
  setContext(alertContextKey, alertStoreInstance);

  // Set the context during component initialisation
  setContext(gameControllerContextKey, gameControllerInstance);
  
  // Simple client-side routing
  let currentPath = $state(window.location.pathname);
  
  // Handle redirect parameter from 404.html
  $effect(() => {
    const url = new URL(window.location.href);
    const redirect = url.searchParams.get('redirect');
    if (redirect) {
      // Remove the redirect param and navigate to the original path
      window.history.replaceState({}, '', redirect);
      currentPath = new URL(redirect, window.location.origin).pathname;
    }
  });
  
  // Update path when URL changes
  window.addEventListener('popstate', () => {
    currentPath = window.location.pathname;
  });
</script>

<Alert />  

<main>
  {#if currentPath === "/table"}
    <Table />
  {:else}
    <Home />
  {/if}
</main>