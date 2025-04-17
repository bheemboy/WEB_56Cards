// AlertStore.svelte.ts
export type AlertType = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark" | "hidden";

export type AlertInfo = {
    type?: AlertType,
    title?: string,
    message?: string,
    duration?: number,
    showDelay?: number,
};

// Create a unique key for our context
export const alertContextKey = Symbol('alertContext');

// Default alert state
export const defaultAlertState: AlertInfo = {
    type: "hidden",
    title: "",
    message: "",
    duration: 2000,
    showDelay: 250
};

export class AlertStore {
    private _alertState = $state(defaultAlertState);
    
    // Public getter for state 
    public get state() {
        return this._alertState;
    }

    // Singleton pattern implementation
    private static _instance = new AlertStore();
    public static getInstance(): AlertStore {
        return AlertStore._instance;
    }
    
    private constructor() {}

    // Show alert with specified properties
    public showAlert(info: AlertInfo): void {
        this._alertState = { ...defaultAlertState, ...info };
    }

    // Hide the current alert
    public hideAlert(): void {
        this._alertState = { ...this._alertState, type: "hidden" };
    }

    // Convenience methods for common alert types
    public showSuccess(message: string, title?: string, duration?: number): void {
        this.showAlert({ 
            type: "success", 
            message, 
            title, 
            duration: duration ?? defaultAlertState.duration 
        });
    }

    public showError(message: string, title?: string, duration?: number): void {
        this.showAlert({ 
            type: "danger", 
            message, 
            title: title ?? "Error", 
            duration: duration ?? defaultAlertState.duration 
        });
    }

    public showWarning(message: string, title?: string, duration?: number): void {
        this.showAlert({ 
            type: "warning", 
            message, 
            title: title ?? "Warning", 
            duration: duration ?? defaultAlertState.duration 
        });
    }

    public showInfo(message: string, title?: string, duration?: number): void {
        this.showAlert({ 
            type: "info", 
            message, 
            title, 
            duration: duration ?? defaultAlertState.duration 
        });
    }
}

// Export the singleton instance
export const alertStoreInstance: AlertStore = AlertStore.getInstance();

// For backward compatibility
export function getAlertContext() {
    return alertStoreInstance;
}