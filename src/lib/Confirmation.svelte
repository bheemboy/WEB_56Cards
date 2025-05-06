<!-- Confirmation.svelte -->
<script lang="ts">
  // Define the props interface
  type ConfirmationProps = {
    title?: string;
    message?: string;
    yesText?: string;
    noText?: string;
    response?: boolean;
    onclose?: (event: { confirmed: boolean }) => void;
  };
  
  // Svelte 5 props declaration
  let { 
    title = "Confirmation", 
    message = "Are you sure you want to proceed?", 
    yesText = "Yes", 
    noText = "No", 
    response = $bindable(false),
    onclose
  }: ConfirmationProps = $props();
  
  // Handle confirmation result
  function handleConfirm(confirmed: boolean): void {
    response = confirmed;
    onclose?.({ confirmed });
  }
</script>

<div 
  class="overlay" 
  onclick={(e) => e.target === e.currentTarget && handleConfirm(false)}
  onkeydown={(e) => e.key === 'Escape' && handleConfirm(false)}
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  tabindex="-1"
>
  <div 
    class="confirmation-dialog" 
    role="alertdialog"
  >
    <div class="confirmation-content">
      <h2 id="dialog-title">{title}</h2>
      {#if message}
        <p id="dialog-description">{message}</p>
      {/if}
      <div class="button-group">
        <button class="btn-no" onclick={() => handleConfirm(false)}>
          {noText}
        </button>
        <button class="btn-yes" onclick={() => handleConfirm(true)}>
          {yesText}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .confirmation-dialog {
    background-color: rgba(161, 161, 161, 0.5);
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    width: clamp(200px, 35cqw, 50cqw);
    padding: 20px;
  }
  
  .confirmation-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  h2 {
    font-size: 18px;
    margin: 0;
    color: #ffffff;
  }
  
  p {
    margin: 0;
    color: #cccccc;
  }
  
  .button-group {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
  }
  
  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    background-color: rgb(182, 226, 21, .5);
    color: white;
  }
  
  button:hover {
    background-color:  rgb(175, 135, 76);
  }
</style>
