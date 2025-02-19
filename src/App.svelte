<script lang="ts">
  import CardsDeck from "./lib/CardsDeck.svelte";
  import Koolies from "./lib/Koolies.svelte";
  
  let team0=0;
  let koolie_count0=3;
  let team1=1;
  let koolie_count1=8;
  let cards = ['H0', 'H10', 'CA', 'C5', 'D3', 'H2', 'SJ', 'C0'];

</script>

<Koolies bind:team={team0} bind:koolie_count={koolie_count0} />
<CardsDeck bind:cards/>
<Koolies bind:team={team1} bind:koolie_count={koolie_count1} />
