<script lang="ts">
    import CardsDeck from "../lib/CardsDeck.svelte";
    import Koolies from "../lib/Koolies.svelte";
    
    const team0 = {
      team: 0,
      koolie_count: 3,
    }
    const team1 = {
      team: 1,
      koolie_count: 8,
    }

    const cards = ['H0', 'H10', 'CA', 'C5', 'D3', 'H2', 'SJ', 'C0'];
  
  </script>
  
  <div>
      <Koolies {...team0} />
      <CardsDeck {cards}/>
      <Koolies {...team1} />
    </div>
  
