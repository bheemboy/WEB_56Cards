<!-- Chair.svelte -->
<script lang="ts">
  import { type Chair } from "./states/Chairs.svelte";
  
  export interface ChairProps {
    chair: Chair
    currentPlayerPosition: number
  }
  let { chair, currentPlayerPosition} : ChairProps = $props();

</script>

<div class="highlighted-container">
  {chair.Occupant?.Name ?? ""}
</div>

<style>
  .highlighted-container {
    min-width: 5vw;
    min-height: 5vw;
    border: 2px solid white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 12px rgba(13, 36, 115, 0.1);
  }
</style>
