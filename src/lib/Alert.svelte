<script lang="ts">
  // Alert.svelte
  import { onMount } from 'svelte';

  const { 
    type = "warning", 
    title = "",
    message = "",
    dismissible = true,
    duration = 3000, // Duration in ms before auto-dismissal
    showDelay = 500, // Delay in ms before showing the alert
    show = true
  } = $props<{
    type?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark",
    title?: string,
    message: string,
    dismissible?: boolean,
    duration?: number,
    showDelay?: number,
    show?: boolean
  }>();

  let visible = $state(false); // Start with visible false
  let shouldShow = $state(show);
  let dismissTimer: number | undefined;
  let showTimer: number | undefined;

  function dismissAlert() {
    shouldShow = false;
    visible = false;
    if (dismissTimer) {
      clearTimeout(dismissTimer);
    }
    if (showTimer) {
      clearTimeout(showTimer);
    }
  }

  onMount(() => {
    // Set timer to delay showing the alert
    if (shouldShow) {
      showTimer = setTimeout(() => {
        if (shouldShow) { // Double-check that we still want to show the alert
          visible = true;
          
          // Set timer to auto-dismiss the alert after it becomes visible
          if (duration > 0) {
            dismissTimer = setTimeout(() => {
              visible = false;
              shouldShow = false;
            }, duration);
          }
        }
      }, showDelay);
    }

    return () => {
      // Clean up both timers if component is destroyed
      if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
      if (showTimer) {
        clearTimeout(showTimer);
      }
    };
  });
</script>

{#if visible}
  <div class={`floating-alert alert alert-${type} ${dismissible ? 'alert-dismissible' : ''} fade show`} role="alert">
    <div class="alert-content">
      {#if title}
        <strong>{title}</strong> {message}
      {:else}
        {message}
      {/if}
    </div>
    
    {#if dismissible}
      <button type="button" class="close-button" onclick={dismissAlert} aria-label="Close">
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
    padding-right: 20px; /* Add extra padding on the right */
  }

  .alert {
    padding: 0.5rem 1.25rem; /* Reduced top/bottom padding from 0.75rem to 0.5rem */
    border: 1px solid transparent;
    line-height: 1.2; /* Added to make text more compact */
  }
  
  .alert-content {
    flex-grow: 1;
    font-size: 0.9rem; /* Slightly smaller font size */
  }
  
  .close-button {
    background-color: transparent;
    border: none;
    padding: 0.25rem 1rem; /* Reduced top/bottom padding from 0.5rem to 0.25rem */
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
    font-size: 1.3rem; /* Slightly smaller from 1.5rem */
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