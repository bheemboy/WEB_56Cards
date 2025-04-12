// AlertStore.svelte.ts
export type AlertType = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark" | "hidden";

export type AlertInfo = {
    type?: AlertType,
    title?: string,
    message?: string,
    dismissible?: boolean,
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
    dismissible: true,
    duration: 2000,
    showDelay: 250
};

export class AlertStore {
    private _alertState = $state(defaultAlertState);
    
    // Public getter for state 
    public get state() {
        return this._alertState;
    }

    // Static instance holder - create instance immediately
    private static _instance = new AlertStore();

    // Public static method to get the single instance
    public static getInstance(): AlertStore {
        return AlertStore._instance;
    }
    
    // Private constructor to enforce singleton pattern
    private constructor() {
        // Singleton instance created
    }

    // Methods to show different types of alerts
    public showAlert(info: AlertInfo): void {
        // Clear any properties that aren't provided
        const cleanInfo = { ...defaultAlertState };
        // Override with new info
        Object.assign(cleanInfo, info);
        // Assign to state to trigger updates
        this._alertState = cleanInfo;
    }

    public hideAlert(): void {
        // Only update the type property to hidden
        this._alertState = { ...this._alertState, type: "hidden" };
    }

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

// Create and export the singleton instance
export const alertStoreInstance: AlertStore = AlertStore.getInstance();

// Get the alert context - kept for backward compatibility
export function getAlertContext() {
    return alertStoreInstance;
}
