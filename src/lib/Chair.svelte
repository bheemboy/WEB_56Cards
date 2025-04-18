<!-- Chair.svelte -->
<script lang="ts">
  import { type Chair } from "./states/Chairs.svelte";
  
  export interface ChairProps {
    chair: Chair;
    currentPlayerPosition: number;
    totalChairs?: number; // Optional, defaults to 8
  }
  let { chair, currentPlayerPosition, totalChairs = 8 }: ChairProps = $props();

  // Calculate relative position (0 to N-1, where N is total chairs)
  // This determines position around the table
  let relativePosition: number;
  
  // Function to determine chair position class
  function getPositionClass(chairPos: number, playerPos: number, totalChairs: number = 8): string {
    // Calculate relative position
    relativePosition = (chairPos - playerPos + totalChairs) % totalChairs;
    
    // Map relative position to a position class
    const positionClasses = {
      4: { // 4-player game positions
        0: "self-bottom", // Current player (not actually shown)
        1: "p4-opponent-right",
        2: "p4-opponent-top",
        3: "p4-opponent-left"
      },
      6: { // 6-player game positions
        0: "self-bottom", // Current player (not actually shown)
        1: "p6-opponent-bottom-right",
        2: "p6-opponent-right",
        3: "p6-opponent-top",
        4: "p6-opponent-left",
        5: "p6-opponent-bottom-left"
      },
      8: { // 8-player game positions
        0: "self-bottom", // Current player (not actually shown)
        1: "p8-opponent-bottom-right",
        2: "p8-opponent-right",
        3: "p8-opponent-top-right",
        4: "p8-opponent-top",
        5: "p8-opponent-top-left",
        6: "p8-opponent-left",
        7: "p8-opponent-bottom-left"
      }
    };
    
    // Get the mapping for the current total chairs
    // Default to 4 if totalChairs is not 4, 6, or 8
    const mapping = positionClasses[totalChairs as 4 | 6 | 8] || positionClasses[8];
    
    // Return the position class for the relative position
    return mapping[relativePosition as keyof typeof mapping] || "";
  }
  
  // Get position class for this chair
  const positionClass = getPositionClass(chair.Position, currentPlayerPosition, totalChairs);
  
  // Function to determine team color based on position
  function getTeamClass(position: number): string {
    // In a standard game, even positions are one team, odd positions are another
    // This is based on the images you provided where red and blue alternate
    return position % 2 === 0 ? "team-blue" : "team-red";
  }
</script>

<div class={`chair-container ${positionClass}`}>
  <div class={`highlighted-container ${getTeamClass(chair.Position)}`}>
    {chair.Occupant?.Name ?? ""}
  </div>
</div>

<style>
  .chair-container {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .highlighted-container {
    min-width: 5vw;
    min-height: 5vw;
    border: 2px solid white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 12px rgba(13, 36, 115, 0.1);
    color: white;
    text-align: center;
  }
  
  .team-blue {
    background-color: rgba(0, 0, 255, 0.7);
  }
  
  .team-red {
    background-color: rgba(255, 0, 0, 0.7);
  }
  

  /* Position classes for 4, 6, and 8 player games */
  /* 4-player positions */
  .p4-opponent-right {
    right: 5%;
    top: 45%;
    transform: translateY(-50%);
  }
  .p4-opponent-top {
    top: 5%;
    left: 50%;
    transform: translateX(-50%);
  }
  .p4-opponent-left {
    left: 5%;
    top: 45%;
    transform: translateY(-50%);
  }
  
  /* Additional positions for 6-player game */
  .p6-opponent-right {
    right: 8%;
    top: 20%;
    transform: translateY(-50%);
  }
  .p6-opponent-top {
    top: 2%;
    left: 50%;
    transform: translateX(-50%);
  }
  .p6-opponent-left {
    left: 8%;
    top: 20%;
    transform: translateY(-50%);
  }
  .p6-opponent-bottom-right {
    right: 2%;
    bottom: 40%;
  }
  .p6-opponent-bottom-left {
    left: 2%;
    bottom: 40%;
  }
  
  /* Additional positions for 8-player game */
  .p8-opponent-right {
    right: 2%;
    top: 35%;
    transform: translateY(-50%);
  }
  .p8-opponent-top {
    top: 2%;
    left: 50%;
    transform: translateX(-50%);
  }
  .p8-opponent-left {
    left: 2%;
    top: 35%;
    transform: translateY(-50%);
  }
  .p8-opponent-bottom-right {
    right: 3%;
    bottom: 35%;
  }
  .p8-opponent-bottom-left {
    left: 3%;
    bottom: 35%;
  }
  .p8-opponent-top-right {
    right: 18%;
    top: 8%;
  }
  .p8-opponent-top-left {
    left: 18%;
    top: 8%;
  }
</style>