/**
 * Location Service
 * Handles geolocation requests and location validation
 */

const API_BASE_URL = 'http://localhost:5001';

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export interface LocationValidationResult {
    allowed: boolean;
    distance: number | null;
    message: string;
}

/**
 * Get user's current location using browser Geolocation API
 * @returns Promise with location coordinates
 */
export const getCurrentLocation = (): Promise<LocationCoordinates> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let errorMessage = 'Failed to get location';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable. Please check your GPS settings.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again.';
                        break;
                }

                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
};

/**
 * Validate location coordinates against office location via backend API
 * @param latitude User's latitude
 * @param longitude User's longitude
 * @returns Promise with validation result
 */
export const validateLocation = async (
    latitude: number,
    longitude: number
): Promise<LocationValidationResult> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/validate-location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude, longitude })
        });

        if (!response.ok) {
            throw new Error('Failed to validate location');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Location validation error:', error);
        throw new Error('Failed to validate location. Please try again.');
    }
};

/**
 * Check if user is at office location
 * Combines getCurrentLocation and validateLocation
 * @returns Promise with validation result
 */
export const checkOfficeLocation = async (): Promise<LocationValidationResult> => {
    const location = await getCurrentLocation();
    const result = await validateLocation(location.latitude, location.longitude);
    return result;
};
