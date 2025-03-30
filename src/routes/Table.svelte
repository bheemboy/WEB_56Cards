<!-- Table.svelte -->
<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { loginParams } from "../lib/LoginParams.svelte";
  import { ConnectionState } from "../lib/Constants";
  import { cards56HubContextKey } from '../lib/Cards56Hub.svelte';
  import type { Cards56Hub } from '../lib/Cards56Hub.svelte';

  // Get the hub instance from the context
  const hub:Cards56Hub = getContext(cards56HubContextKey);

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
    
    // Update loginParams
    loginParams.userName = params.username ?? loginParams.userName
    loginParams.tableType = params.tabletype ?? loginParams.tableType
    loginParams.tableName = params.tablename ?? loginParams.tableName
    loginParams.language = params.lang ?? loginParams.language
    loginParams.watch = params.watch === 'true' ? true : loginParams.watch
  });

  // $effect(() => {
  //   console.log("loginParams changed:", $state.snapshot(loginParams));
  // });

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

  <input type="button" value="Connect" on:click={() => hub.connect()} />
  <input type="button" value="Disconnect" on:click={() => hub.disconnect()} />
</div>

<style>
  /* ... */
</style>
