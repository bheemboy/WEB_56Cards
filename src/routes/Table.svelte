<!-- Table.svelte -->
<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { loginParams } from "../lib/LoginParams.svelte";
  import { type Cards56Hub, ConnectionState, cards56HubContextKey} from '../lib/Cards56Hub.svelte';
  import Alert from '../lib/Alert.svelte';
  import Avatar from '../lib/Avatar.svelte';

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
    <Alert type="info" title="Connecting" message="Attempting to connect to https://play.56cards.com/Cards56Hub ..." dismissible={true} duration = {0}/>
  {:else if hub.connectionState === ConnectionState.RECONNECTING}
    <Alert type="info" title="Reconnecting" message="Attempting to reconnect to https://play.56cards.com/Cards56Hub ..." dismissible={true} duration = {0}/>
  <!--
  {:else if hub.connectionState === ConnectionState.CONNECTED}
      <Alert type="success" title="Connected" message="You are now connected to the server." dismissible={true}/>
  -->
  {:else if hub.connectionState === ConnectionState.FAILED}
    <Alert type="danger" title="Connection Failed" message="Cannot connect to https://play.56cards.com/Cards56Hub." dismissible={true} duration = {0}/>
  {:else if hub.connectionState === ConnectionState.DISCONNECTED}
    <Alert type="danger" title="Disconnected" message="" dismissible={true} duration = {0}/>
  {/if}

  <!-- <input type="button" value="Connect" onclick={() => hub.connect()} />
  <input type="button" value="Disconnect" onclick={() => hub.disconnect()} /> -->

  <div class="avatar-container">
    <Avatar team={1} />
  </div>
</div>

<style>
  /* ... */

  .avatar-container {
    margin: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
