<script lang="ts">
  import { setContext } from 'svelte';
  import Home from "./routes/Home.svelte";
  import Table from "./routes/Table.svelte";
  import { gameControllerInstance, gameControllerContextKey } from './lib/GameController.svelte';
  import { alertStoreInstance, alertContextKey } from './lib/AlertStore.svelte';
  import Alert from './lib/Alert.svelte';

  // Set the alert context with the singleton instance
  setContext(alertContextKey, alertStoreInstance);

  // Set the context during component initialisation
  setContext(gameControllerContextKey, gameControllerInstance);
  
  // Simple client-side routing
  let currentPath = $state(window.location.pathname);
  
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