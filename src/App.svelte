<script lang="ts">
  import { Router, Link, Route } from "svelte-routing";
  import Home from "./routes/Home.svelte";
  import Table from "./routes/Table.svelte";
  import { setContext } from 'svelte';
  import { cards56HubInstance, cards56HubContextKey } from './lib/Cards56Hub.svelte';
  import { alertStoreInstance, alertContextKey } from './lib/AlertStore.svelte';
  import Alert from './lib/Alert.svelte'

  // Set the alert context with the singleton instance
  setContext(alertContextKey, alertStoreInstance);

  // Set the context during component initialisation
  // We pass the *instance* itself, which contains the $state property
  setContext(cards56HubContextKey, cards56HubInstance);
  
  export let url = "";
</script>

<Alert />  

<Router {url}>
  <div>
    <Route path="/table"><Table /></Route>
    <Route path="/"><Home /></Route>
  </div>
</Router>