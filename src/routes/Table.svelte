<!-- Table.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { loginParams } from "../lib/Types.svelte";
  import { cards56Hub, ConnectionState } from "../lib/Cards56Hub.svelte";

  // Use $effect for side effects like fetching data or reacting to prop changes
  // onMount is still fine for initial setup run once after component mounts
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
    // console.log("params:", params);
    
    // Update loginParams
    loginParams.userName = params.username ?? loginParams.userName
    loginParams.tableType = params.tabletype ?? loginParams.tableType
    loginParams.tableName = params.tablename ?? loginParams.tableName
    loginParams.language = params.lang ?? loginParams.language
    loginParams.watch = params.watch === 'true' ? true : loginParams.watch
  });

  $effect(() => {
    console.log("loginParams changed:", loginParams);
  });

  
  // Subscribe to the connection state store
  let connectionState = $state(ConnectionState.DISCONNECTED); // Default state
  const unsubscribe = cards56Hub.connectionState.subscribe(state => {
    connectionState = state;
  });
  
  // Clean up subscription when component is destroyed
  onDestroy(unsubscribe);
  
</script>

<div class="table-container">
  {#if connectionState === ConnectionState.CONNECTING}
    <div class="status-indicator connecting">Connecting...</div>
  {:else if connectionState === ConnectionState.RECONNECTING}
    <div class="status-indicator reconnecting">Reconnecting...</div>
  {:else if connectionState === ConnectionState.CONNECTED}
    <div class="status-indicator connected">Connected</div>
  {:else if connectionState === ConnectionState.FAILED}
    <div class="status-indicator failed">Connection Failed</div>
  {:else if connectionState === ConnectionState.DISCONNECTED}
    <div class="status-indicator disconnected">Disconnected</div>
  {/if}
</div>

<style>
  /* ... */
</style>
