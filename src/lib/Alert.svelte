<!-- Alert.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { alertStoreInstance } from './AlertStore.svelte';
  
  // Get the alert instance directly
  const alertStore = alertStoreInstance;
  
  // Create a reactive variable to track the alert state
  let visible = $state(false);
  let dismissTimer: ReturnType<typeof setTimeout> | undefined;
  let showTimer: ReturnType<typeof setTimeout> | undefined;

  function dismissAlert() {
    visible = false;
    clearTimers();
    alertStore.hideAlert();
  }

  function clearTimers() {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = undefined;
    }
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = undefined;
    }
  }

  // Reactively watch the alert state
  $effect(() => {
    // Get the current state directly on each effect run
    const currentState = alertStore.state;
    
    // Clear any existing timers
    clearTimers();
    
    if (currentState.type === "hidden") {
      visible = false;
    } else {
      // Show the alert
      showTimer = setTimeout(() => {
        visible = true;
        
        if (currentState.duration && currentState.duration > 0) {
          dismissTimer = setTimeout(() => {
            visible = false;
            alertStore.hideAlert();
          }, currentState.duration);
        }
      }, currentState.showDelay || 250);
    }
  });

  onDestroy(clearTimers);
</script>

{#if visible && alertStore.state.type !== "hidden"}
  <div class={`floating-alert alert alert-${alertStore.state.type} ${alertStore.state.dismissible ? 'alert-dismissible' : ''} fade show`} role="alert">
    <div class="alert-content">
      {#if alertStore.state.title}<strong>{alertStore.state.title}</strong> {/if}
      {#if alertStore.state.message}{alertStore.state.message}{/if}
    </div>
    
    {#if alertStore.state.dismissible !== false}
      <button 
        type="button" 
        class="close-button" 
        onclick={dismissAlert} 
        aria-label="Close"
      >
        <span class="close-icon">×</span>
      </button>
    {/if}
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
  }

  .alert {
    padding: 0.5rem 1.25rem;
    border: 1px solid transparent;
    line-height: 1.2;
  }
  
  .alert-content {
    flex-grow: 1;
    font-size: 0.9rem;
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