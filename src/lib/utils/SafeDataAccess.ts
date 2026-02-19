/**
 * SafeDataAccess - Utility to safely access nested properties and prevent undefined errors
 */

export class SafeDataAccess {
  /**
   * Safely get a nested property value from an object
   * @param obj - The object to access
   * @param path - The property path (e.g., 'data.price.value')
   * @param defaultValue - Default value if property doesn't exist
   */
  static get<T = any>(obj: any, path: string, defaultValue?: T): T {
    if (!obj || typeof obj !== 'object') {
      return defaultValue as T;
    }

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue as T;
      }
      result = result[key];
    }

    return result !== undefined ? result : (defaultValue as T);
  }

  /**
   * Safely access array methods
   * @param arr - The array to access
   * @param defaultValue - Default value if not an array
   */
  static array<T>(arr: any, defaultValue: T[] = []): T[] {
    return Array.isArray(arr) ? arr : defaultValue;
  }

  /**
   * Safely parse numbers
   * @param value - Value to parse
   * @param defaultValue - Default value if parsing fails
   */
  static number(value: any, defaultValue: number = 0): number {
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Safely parse dates with validation
   * @param value - Date value to parse
   * @param defaultValue - Default date if parsing fails
   */
  static date(value: any, defaultValue: Date = new Date()): Date {
    if (!value) return defaultValue;
    
    try {
      const date = new Date(value);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return defaultValue;
      }
      // Check if date is within reasonable bounds (1900-2100)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        return defaultValue;
      }
      return date;
    } catch (error) {
      console.error(`Error parsing date: ${value}`, error);
      return defaultValue;
    }
  }

  /**
   * Safely format date to string
   * @param date - Date to format
   * @param locale - Locale for formatting
   * @param options - Formatting options
   */
  static formatDate(
    date: any,
    locale: string = 'en-US',
    options?: Intl.DateTimeFormatOptions
  ): string {
    try {
      const safeDate = this.date(date);
      return safeDate.toLocaleDateString(locale, options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Safely format date to ISO string
   * @param date - Date to format
   */
  static toISOString(date: any): string {
    try {
      const safeDate = this.date(date);
      return safeDate.toISOString();
    } catch (error) {
      console.error('Error converting to ISO string:', error);
      return new Date().toISOString();
    }
  }

  /**
   * Safely access object properties with type checking
   * @param obj - Object to check
   * @param property - Property name
   * @param type - Expected type
   */
  static hasProperty<T>(
    obj: any,
    property: string,
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array'
  ): obj is T {
    if (!obj || typeof obj !== 'object') return false;
    
    const hasIt = property in obj && obj[property] !== undefined;
    
    if (!hasIt || !type) return hasIt;
    
    switch (type) {
      case 'array':
        return Array.isArray(obj[property]);
      case 'object':
        return typeof obj[property] === 'object' && !Array.isArray(obj[property]);
      default:
        return typeof obj[property] === type;
    }
  }

  /**
   * Safely map over arrays with error handling
   * @param arr - Array to map
   * @param mapper - Mapping function
   * @param defaultValue - Default value for failed mappings
   */
  static map<T, U>(
    arr: any,
    mapper: (item: T, index: number) => U,
    defaultValue: U[] = []
  ): U[] {
    try {
      const safeArray = this.array<T>(arr);
      return safeArray.map((item, index) => {
        try {
          return mapper(item, index);
        } catch (error) {
          console.error(`Error in map at index ${index}:`, error);
          return undefined as any;
        }
      }).filter(item => item !== undefined);
    } catch (error) {
      console.error('Error in safe map:', error);
      return defaultValue;
    }
  }

  /**
   * Safely filter arrays with error handling
   * @param arr - Array to filter
   * @param predicate - Filter function
   */
  static filter<T>(
    arr: any,
    predicate: (item: T, index: number) => boolean
  ): T[] {
    try {
      const safeArray = this.array<T>(arr);
      return safeArray.filter((item, index) => {
        try {
          return predicate(item, index);
        } catch (error) {
          console.error(`Error in filter at index ${index}:`, error);
          return false;
        }
      });
    } catch (error) {
      console.error('Error in safe filter:', error);
      return [];
    }
  }

  /**
   * Create a safe wrapper for any value
   * @param value - Value to wrap
   * @param defaultValue - Default value
   */
  static wrap<T>(value: any, defaultValue: T): T {
    return value !== null && value !== undefined ? value : defaultValue;
  }
}

// Helper functions for common use cases
export const safe = {
  get: SafeDataAccess.get,
  array: SafeDataAccess.array,
  number: SafeDataAccess.number,
  date: SafeDataAccess.date,
  formatDate: SafeDataAccess.formatDate,
  toISOString: SafeDataAccess.toISOString,
  hasProperty: SafeDataAccess.hasProperty,
  map: SafeDataAccess.map,
  filter: SafeDataAccess.filter,
  wrap: SafeDataAccess.wrap,
};

// Type guards
export const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

export const isValidArray = <T = any>(value: any): value is T[] => {
  return Array.isArray(value);
};

export const isValidObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};