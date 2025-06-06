// Create LoginParams class first
export interface LoginParamsData {
  username: string;
  tabletype: string;
  tablename: string;
  language: string;
  watch: boolean;
}

const defaultLoginParamsData: LoginParamsData = {
  username: "",
  tabletype: "0",
  tablename: "",
  language: "ml",
  watch: false
};

export class LoginParams {
  private readonly _username: string;
  private readonly _tabletype: string;
  private readonly _tablename: string;
  private readonly _language: string;
  private readonly _watch: boolean;

  // Private constructor - use factory methods instead
  private constructor(data: Partial<LoginParamsData>) {
    this._username = data.username || defaultLoginParamsData.username;
    this._tabletype = data.tabletype || defaultLoginParamsData.tabletype;
    this._tablename = data.tablename || defaultLoginParamsData.tablename;
    this._language = data.language || defaultLoginParamsData.language;
    this._watch = typeof data.watch === 'boolean' ? data.watch : defaultLoginParamsData.watch;
  }

  // Getters
  public get username(): string {
    return this._username;
  }

  public get tabletype(): string {
    return this._tabletype;
  }

  public get tablename(): string {
    return this._tablename;
  }

  public get language(): string {
    return this._language;
  }

  public get watch(): boolean {
    return this._watch;
  }

  /**
   * Factory method to create a LoginParams instance.
   * Attempts to load data from localStorage. If data exists and is valid JSON,
   * it uses that data. Otherwise, it falls back to default values.
   */
  public static create(): LoginParams {
    const storageKey = "56cards_last_login_params";
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      console.info(`LoginParams: Found stored data for key '${storageKey}': '${storedData}'`);
      try {
        // Attempt to parse the stored JSON data
        const parsedData = JSON.parse(storedData);

        // Ensure parsedData is a non-null object before passing to constructor
        if (parsedData && typeof parsedData === 'object') {
          console.info(`LoginParams: Successfully parsed stored data.`);
          // Pass the parsed data to the constructor.
          // The constructor handles merging with defaults / missing properties.
          // Cast to Partial<> because we don't know for sure if all keys exist
          return new LoginParams(parsedData as Partial<LoginParamsData>);
        } else {
          // Handle cases where storedData is valid JSON but not an object (e.g., "null", "true", "123")
           console.warn(`LoginParams: Parsed data from storage for key '${storageKey}' is not an object ('${typeof parsedData}'). Using defaults.`);
        }

      } catch (error) {
        // Catch JSON parsing errors
        console.error(`LoginParams: Error parsing stored data from key '${storageKey}'. Invalid JSON: '${storedData}'. Falling back to defaults.`, error);
        // Execution will continue outside the 'if' block to return defaults
      }
    } else {
      console.info(`LoginParams: No stored data found for key '${storageKey}'. Using defaults.`);
    }

    // Fallback: Return a new instance with default values if:
    // 1. No data was found in localStorage.
    // 2. Data was found but JSON.parse threw an error.
    // 3. Data was parsed but wasn't a usable object.
    console.info("LoginParams: Creating instance with default values.");
    // Pass the complete default object to the constructor
    return new LoginParams(defaultLoginParamsData);
  }

   /**
   * Creates a new LoginParams instance if newData differs from the current one.
   * Saves the new state to localStorage if changes were made.
   * @param current The current LoginParams instance.
   * @param newData An object with properties to update.
   * @returns A tuple: [LoginParams instance (new or current), boolean indicating if changes were made].
   */
  public static update(current: LoginParams, newData: Partial<LoginParamsData>): [LoginParams, boolean] {
    const storageKey = "56cards_last_login_params";

    // Construct the potential new data state by merging
    const potentialNewData: LoginParamsData = {
        username: newData.username !== undefined ? newData.username : current.username,
        tabletype: newData.tabletype !== undefined ? newData.tabletype : current.tabletype,
        tablename: newData.tablename !== undefined ? newData.tablename : current.tablename,
        language: newData.language !== undefined ? newData.language : current.language,
        watch: newData.watch !== undefined ? newData.watch : current.watch
    };

    // Check if any value actually changed compared to the current instance
    const hasChanged =
      potentialNewData.username !== current.username ||
      potentialNewData.tabletype !== current.tabletype ||
      potentialNewData.tablename !== current.tablename ||
      potentialNewData.language !== current.language ||
      potentialNewData.watch !== current.watch;

    // If nothing changed, return the current instance and false
    if (!hasChanged) {
      return [current, false];
    }

    // If changed, save the *new* complete state and create a new instance
    try {
        const dataToStore = JSON.stringify(potentialNewData);
        console.info(`LoginParams: Updating stored data for key '${storageKey}':`, dataToStore);
        localStorage.setItem(storageKey, dataToStore);
    } catch (error) {
        console.error(`LoginParams: Failed to save updated data to localStorage for key '${storageKey}'.`, error);
        // Decide if you want to proceed without saving or handle differently
    }

    // Create and return a new instance with the updated values
    const newInstance = new LoginParams(potentialNewData);
    return [newInstance, true];
  }

  // unchanged clone method
  public clone(): LoginParamsData {
    return {
      username: this._username,
      tabletype: this._tabletype,
      tablename: this._tablename,
      language: this._language,
      watch: this._watch
    };
  }
}