<!-- Table.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { loginParams } from "../lib/Types.svelte";
  
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
  
</script>

<div class="table-container">

</div>

<style>
  /* ... */
</style>
