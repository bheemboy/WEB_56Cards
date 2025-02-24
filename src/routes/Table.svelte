<script lang="ts">
    import CardsDeck from "../lib/CardsDeck.svelte";
    import Koolies from "../lib/Koolies.svelte";
    import Avatar from "../lib/Avatar.svelte";
    
    let t0 = $state(0);

    const team0 = {
      team: 0,
      koolie_count: 3,
    }
    const team1 = {
      team: 1,
      koolie_count: 8,
    }

    const cards = ['H0', 'H10', 'CA', 'CA', 'D3', 'CA', 'H2', 'SJ', 'C0'];
  
  </script>
  
  <div>
      <Koolies {...team0} />
      <CardsDeck {cards}/>
      <Koolies {...team1} />
      <Avatar team={t0} />
      <Avatar team={1} />

      <button onclick={() => t0 = t0 === 0 ? 1 : 0}>Toggle Avatar</button>
      
    </div>
  
