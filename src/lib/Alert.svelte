<!-- Alert.svelte -->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { alertStoreInstance } from './AlertStore.svelte';
  
  // Create reactive variables
  let visible = $state(false);
  let minimized = $state(false);
  let initialDisplayTimeElapsed = $state(false);
  let isTouchDevice = $state(false);
  
  // Timers
  let showTimer: number | undefined;
  let minimizeTimer: number | undefined;
  let mediaQueryList: MediaQueryList | undefined;
  
  // Constants
  const DEFAULT_MINIMIZE_DELAY = 3000;
  
  // Detect touch device
  function checkTouchDevice() {
    try {
      // Check for touch capabilities and viewport size
      const hasTouchPoints = navigator.maxTouchPoints > 0;
      mediaQueryList = window.matchMedia('(pointer: coarse)');
      const isCoarsePointer = mediaQueryList.matches;
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
      
      // Firefox responsive design mode detection
      const isSimulated = /firefox/i.test(navigator.userAgent.toLowerCase()) && 
                          (window.outerWidth !== window.innerWidth || window.devicePixelRatio !== 1);
      
      // Set device type
      isTouchDevice = isSimulated ? (window.innerWidth <= 1024) : (hasTouchPoints || isCoarsePointer || isMobileUA);
      
      // Add listener for media query changes
      mediaQueryList.addEventListener('change', checkTouchDevice);
    } catch (e) {
      isTouchDevice = true; // Default to touch device if detection fails
    }
  }
  
  function dismissAlert() {
    visible = false;
    minimized = false;
    clearTimers();
    alertStoreInstance.hideAlert();
  }

  function minimizeAlert() {
    if (!isTouchDevice) minimized = true;
  }

  function maximizeAlert() {
    minimized = false;
    if (minimizeTimer) {
      clearTimeout(minimizeTimer);
      minimizeTimer = undefined;
    }
  }

  function clearTimers() {
    if (showTimer) clearTimeout(showTimer);
    if (minimizeTimer) clearTimeout(minimizeTimer);
    showTimer = minimizeTimer = undefined;
  }

  function handleMouseLeave() {
    if (!isTouchDevice && visible && !minimized && initialDisplayTimeElapsed) {
      minimizeTimer = setTimeout(minimizeAlert, 500);
    }
  }

  function handleMouseEnter() {
    if (minimizeTimer) {
      clearTimeout(minimizeTimer);
      minimizeTimer = undefined;
    }
    if (minimized) maximizeAlert();
  }

  // Set up alert reactively
  $effect(() => {
    const state = alertStoreInstance.state;
    clearTimers();
    initialDisplayTimeElapsed = false;
    
    if (state.type === "hidden") {
      visible = minimized = false;
      return;
    }
    
    // Show the alert
    showTimer = setTimeout(() => {
      visible = true;
      minimized = false;
      
      // Set timer for auto-minimize (desktop only)
      if (!isTouchDevice) {
        const minimizeDelay = (state.duration && state.duration > 0) 
          ? state.duration 
          : DEFAULT_MINIMIZE_DELAY;
          
        setTimeout(() => {
          initialDisplayTimeElapsed = true;
          if (!isTouchDevice) minimizeAlert();
        }, minimizeDelay);
      } else {
        initialDisplayTimeElapsed = true;
      }
    }, state.showDelay || 250);
  });

  // Initialize on mount and clean up on destroy
  onMount(() => {
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
  });
  
  onDestroy(() => {
    clearTimers();
    if (mediaQueryList) mediaQueryList.removeEventListener('change', checkTouchDevice);
    window.removeEventListener('resize', checkTouchDevice);
  });
</script>

{#if visible && alertStoreInstance.state.type !== "hidden"}
  <div 
    class="floating-alert {minimized ? 'minimized' : ''} alert alert-{alertStoreInstance.state.type} fade show" 
    role="alert"
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  >
    <div class="alert-content">
      {#if alertStoreInstance.state.title}<strong>{alertStoreInstance.state.title}</strong> {/if}
      {#if alertStoreInstance.state.message}{alertStoreInstance.state.message}{/if}
    </div>
    
    <button type="button" class="close-button" onclick={dismissAlert} aria-label="Close">
      <span class="close-icon">×</span>
    </button>
  </div>
{/if}

<style>
  .floating-alert {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    z-index: 1050;
    margin: 0;
    border-radius: 0;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-right: 20px;
    transition: height 0.8s ease-in-out, opacity 0.6s ease-in-out, padding 0.8s ease-in-out;
    min-height: 40px;
    overflow: hidden;
  }

  .floating-alert.minimized {
    height: 0.6vh;
    min-height: 6px;
    max-height: 8px;
    padding: 0;
    cursor: pointer;
    opacity: 0.7;
  }

  .floating-alert.minimized .alert-content,
  .floating-alert.minimized .close-button {
    display: none;
  }

  .alert {
    padding: 0.5rem 1.25rem;
    border: 1px solid transparent;
    line-height: 1.2;
  }
  
  .alert-content {
    flex-grow: 1;
    font-size: 0.9rem;
    padding: 0.5rem 0;
  }
  
  .close-button {
    background-color: transparent;
    border: none;
    padding: 0.25rem 1rem;
    margin-right: 15px;
    font-size: 1.5rem;
    line-height: 1;
    color: inherit;
    opacity: 0.5;
    cursor: pointer;
  }
  
  .close-button:hover {
    opacity: 1;
  }
  
  .close-icon {
    font-weight: bold;
    font-size: 1.3rem;
  }
  
  /* Alert variants */
  .alert-warning {
    color: #856404;
    background-color: #fff3cd;
    border-color: #ffeeba;
  }
  
  .alert-primary {
    color: #004085;
    background-color: #cce5ff;
    border-color: #b8daff;
  }
  
  .alert-secondary {
    color: #383d41;
    background-color: #e2e3e5;
    border-color: #d6d8db;
  }
  
  .alert-success {
    color: #155724;
    background-color: #d4edda;
    border-color: #c3e6cb;
  }
  
  .alert-danger {
    color: #721c24;
    background-color: #f8d7da;
    border-color: #f5c6cb;
  }
  
  .alert-info {
    color: #0c5460;
    background-color: #d1ecf1;
    border-color: #bee5eb;
  }
  
  .alert-light {
    color: #818182;
    background-color: #fefefe;
    border-color: #fdfdfe;
  }
  
  .alert-dark {
    color: #1b1e21;
    background-color: #d6d8d9;
    border-color: #c6c8ca;
  }
  
  .fade {
    transition: opacity 0.15s linear;
  }
  
  .show {
    opacity: 1;
  }
</style>