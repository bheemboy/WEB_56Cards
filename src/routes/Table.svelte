<!-- Table.svelte -->
<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { loginParams } from "../lib/LoginParams.svelte";
  import { type Cards56Hub, ConnectionState, cards56HubContextKey} from '../lib/Cards56Hub.svelte';

  // Get the hub instance from the context
  const hub : Cards56Hub = getContext(cards56HubContextKey);
  
  onMount(() => {
    // Parse URL parameters
    const rawParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(
        Array.from(rawParams.entries()).map(([key, value]) => [
            key.toLowerCase(), 
            // Convert lang and watch parameter values to lowercase
            key.toLowerCase() === 'lang' || key.toLowerCase() === 'watch' 
                ? value.toLowerCase() 
                : value
        ])
    );
    
    // Update loginParams
    loginParams.userName = params.username ?? loginParams.userName
    loginParams.tableType = params.tabletype ?? loginParams.tableType
    loginParams.tableName = params.tablename ?? loginParams.tableName
    loginParams.language = params.lang ?? loginParams.language
    loginParams.watch = params.watch === 'true' ? true : loginParams.watch
  });
  
  // Use effect to handle player registration when connection state changes
  // the $effect() block runs once initially after the component is set up
  // And then everytime the hub.connectionState changes
  $effect(() => {
    if (hub.connectionState === ConnectionState.CONNECTED) {
      hub.registerPlayer().catch(error => {
        console.error("Failed to register player:", error);
      });
    }
  });

</script>

<div class="table-container">
  {#if hub.connectionState === ConnectionState.CONNECTING}
    <div class="status-indicator connecting">Connecting...</div>
  {:else if hub.connectionState === ConnectionState.RECONNECTING}
    <div class="status-indicator reconnecting">Reconnecting...</div>
  {:else if hub.connectionState === ConnectionState.CONNECTED}
    <div class="status-indicator connected">Connected</div>
  {:else if hub.connectionState === ConnectionState.FAILED}
    <div class="status-indicator failed">Connection Failed</div>
  {:else if hub.connectionState === ConnectionState.DISCONNECTED}
    <div class="status-indicator disconnected">Disconnected</div>
  {/if}

  <input type="button" value="Connect" onclick={() => hub.connect()} />
  <input type="button" value="Disconnect" onclick={() => hub.disconnect()} />
  <input type="text" value="{$state.snapshot(hub.gameState)? $state.snapshot(hub.gameState.PlayerCards):''}" readonly />
</div>

<style>
  /* ... */
</style>
