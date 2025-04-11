<script lang="ts">
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { loginParams } from "../lib/LoginParams.svelte";

  onMount(() => {
    const savedSettings = localStorage.getItem("56cards_last_login_params");
    if (savedSettings) {
      try {
        const loaded = JSON.parse(savedSettings);
        Object.assign(loginParams, loaded);
      } catch (e) {
        console.error("Error loading saved settings:", e);
      }
    }
  });

  function playGame(watch = false) {
    if (!loginParams.userName) {
      alert("Please enter your name before joining the game");
      return;
    }
    
    localStorage.setItem("56cards_last_login_params", JSON.stringify(loginParams));
    
    navigate(`/table?username=${loginParams.userName}&tabletype=${loginParams.tableType}&tablename=${loginParams.tableName}&lang=${loginParams.language}&watch=${watch}`);
  }
</script>

<main class="container">
  <div class="login-card">
    <div class="header">
      <h1>56 Card Game</h1>
      <p class="subtitle">Kerala's Classic Card Game</p>
    </div>
    
    <div class="card card1"></div>
    <div class="card card2"></div>
    
    <form>
      <div class="form-group">
        <label for="userName">Player Name</label>
        <input 
          id="userName"
          type="text" 
          bind:value={loginParams.userName} 
          placeholder="Enter your name"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="tableType">Table Size</label>
        <div class="select-wrapper">
          <select id="tableType" bind:value={loginParams.tableType}>
            <option value="0">4 Players</option>
            <option value="1">6 Players</option>
            <option value="2">8 Players</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="tableName">Table Name (Optional)</label>
        <input 
          id="tableName"
          type="text" 
          bind:value={loginParams.tableName} 
          placeholder="Leave empty for random table"
        />
      </div>
      
      <div class="form-group">
        <label for="language">Language</label>
        <div class="select-wrapper">
          <select id="language" bind:value={loginParams.language}>
            <option value="en">English</option>
            <option value="ml">Malayalam</option>
          </select>
        </div>
      </div>
            
      <div class="action-buttons">
        <button type="button" class="play-btn" onclick={() => playGame(false)}>
          Play Game
        </button>
        <button type="button" class="watch-btn" onclick={() => playGame(true)}>
          Watch Game
        </button>
      </div>
    </form>
  </div>
</main>

<style>
  
  .container {
    margin: 0;
    font-family: 'Poppins', sans-serif;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1200 800"><defs><linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%2387ceeb"/><stop offset="100%" stop-color="%234b98d4"/></linearGradient></defs><rect width="1200" height="800" fill="url(%23sky)"/><path d="M0,700 Q300,650 600,680 T1200,700 L1200,800 L0,800 Z" fill="%23f2d675"/><path d="M100,540 C100,540 150,450 180,470 C210,490 220,550 240,560 C260,570 300,520 320,540 C340,560 340,610 380,600 C420,590 430,530 460,540 C490,550 490,600 520,590 C550,580 560,520 580,520 C600,520 620,570 630,560 C640,550 640,510 660,520 C680,530 680,570 700,570 C720,570 740,520 760,520 C780,520 780,560 800,560 C820,560 820,520 840,510 C860,500 860,550 880,540 C900,530 900,490 920,500 C940,510 940,560 960,560 C980,560 980,520 1000,520 C1020,520 1020,550 1040,550 C1060,550 1060,500 1080,510 C1100,520 1100,570 1120,560 C1140,550 1140,510 1160,520 C1180,530 1180,560 1200,550 L1200,800 L0,800 Z" fill="%2365340c"/><circle cx="150" cy="490" r="30" fill="%2333a02c"/><circle cx="155" cy="470" r="28" fill="%2333a02c"/><circle cx="160" cy="450" r="25" fill="%2333a02c"/><circle cx="157" cy="430" r="20" fill="%2333a02c"/><circle cx="153" cy="410" r="15" fill="%2333a02c"/><circle cx="450" cy="490" r="30" fill="%2333a02c"/><circle cx="455" cy="470" r="28" fill="%2333a02c"/><circle cx="460" cy="450" r="25" fill="%2333a02c"/><circle cx="457" cy="430" r="20" fill="%2333a02c"/><circle cx="453" cy="410" r="15" fill="%2333a02c"/><circle cx="750" cy="490" r="30" fill="%2333a02c"/><circle cx="755" cy="470" r="28" fill="%2333a02c"/><circle cx="760" cy="450" r="25" fill="%2333a02c"/><circle cx="757" cy="430" r="20" fill="%2333a02c"/><circle cx="753" cy="410" r="15" fill="%2333a02c"/><circle cx="1050" cy="490" r="30" fill="%2333a02c"/><circle cx="1055" cy="470" r="28" fill="%2333a02c"/><circle cx="1060" cy="450" r="25" fill="%2333a02c"/><circle cx="1057" cy="430" r="20" fill="%2333a02c"/><circle cx="1053" cy="410" r="15" fill="%2333a02c"/></svg>');
    background-size: cover;
    background-position: center bottom;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
  }
  
  .login-card {
    position: relative;
    background: rgba(255, 255, 255, 0.95);  /* Increased opacity for better contrast */
    width: 90%;
    max-width: 420px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    padding: 30px;
    backdrop-filter: blur(5px);
    overflow: hidden;
  }
  
  .card {
    position: absolute;
    width: 70px;
    height: 100px;
    background: white;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 1;
  }
  
  .card::before {
    content: '';
    position: absolute;
    width: 50px;
    height: 80px;
    top: 10px;
    left: 10px;
    background: linear-gradient(45deg, #dc2626 0%, #e11d48 100%);
    border-radius: 3px;
  }
  
  .card::after {
    content: '56';
    position: absolute;
    top: 35px;
    left: 22px;
    font-size: 24px;
    font-weight: bold;
    color: white;
  }
  
  .card1 {
    top: -20px;
    right: -15px;
    transform: rotate(15deg);
  }
  
  .card2 {
    bottom: -20px;
    left: -15px;
    transform: rotate(-15deg);
  }
  
  .header {
    text-align: center;
    margin-bottom: 30px;
    position: relative;
    z-index: 2;
  }
  
  h1 {
    color: #0d2473;  /* Darker blue for better contrast */
    font-size: 2.2em;
    margin-bottom: 5px;
    text-shadow: 1px 1px 2px rgba(255,255,255,0.5);
  }
  
  .subtitle {
    color: #333333;  /* Darker text for subtitle */
    font-style: italic;
    font-weight: 500;
  }
  
  .form-group {
    margin-bottom: 20px;
    position: relative;
    z-index: 2;
  }
  
  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;  /* Bolder font weight */
    color: #222222;  /* Darker text for labels */
  }
  
  input[type="text"], select {
    width: 100%;
    padding: 12px;
    border: 1px solid #aaa;  /* Darker border */
    border-radius: 5px;
    font-size: 16px;
    transition: border-color 0.3s, box-shadow 0.3s;
    box-sizing: border-box;
    background-color: rgba(255, 255, 255, 0.95);
    color: #333333;  /* Darker text for inputs */
  }
  
  input[type="text"]::placeholder {
    color: #666666;  /* Darker placeholder text */
  }
  
  input[type="text"]:focus, select:focus {
    border-color: #0d2473;
    outline: none;
    box-shadow: 0 0 0 2px rgba(13, 36, 115, 0.2);
  }
  
  .select-wrapper {
    position: relative;
  }
  
  .select-wrapper::after {
    content: '▼';
    position: absolute;
    right: 12px;
    top: 12px;
    color: #444;  /* Darker dropdown arrow */
    pointer-events: none;
    font-size: 12px;
  }
  
  select {
    appearance: none;
    cursor: pointer;
  }
      
  .action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 30px;
  }
  
  .play-btn, .watch-btn {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    font-weight: 700;  /* Bolder font for buttons */
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .play-btn {
    background-color: #0d2473;
    color: white;
  }
  
  .play-btn:hover {
    background-color: #091c5c;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(13, 36, 115, 0.3);
  }
  
  .watch-btn {
    background-color: rgba(255, 255, 255, 0.95);
    color: #0d2473;
    border: 2px solid #0d2473;
  }
  
  .watch-btn:hover {
    background-color: rgba(13, 36, 115, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 480px) {
    .login-card {
      width: 85%;
      padding: 20px;
    }
    
    h1 {
      font-size: 1.8em;
    }
    
    .action-buttons {
      flex-direction: column;
    }
  }
</style>