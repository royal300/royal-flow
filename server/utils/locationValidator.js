/**
 * Location Validation Utility
 * Provides functions to validate user location against office coordinates
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    return distance;
}

/**
 * Validate if user coordinates are within allowed office radius
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} officeLat - Office latitude
 * @param {number} officeLon - Office longitude
 * @param {number} allowedRadius - Allowed radius in meters
 * @returns {object} Validation result with allowed flag, distance, and message
 */
function validateLocation(userLat, userLon, officeLat, officeLon, allowedRadius) {
    // Validate input
    if (!userLat || !userLon || !officeLat || !officeLon || !allowedRadius) {
        return {
            allowed: false,
            distance: null,
            message: 'Invalid coordinates provided'
        };
    }

    // Calculate distance
    const distance = calculateDistance(userLat, userLon, officeLat, officeLon);
    const allowed = distance <= allowedRadius;

    return {
        allowed,
        distance: Math.round(distance),
        message: allowed
            ? 'Location verified - within office premises'
            : `Access denied - You are ${Math.round(distance)} meters from the office (allowed: ${allowedRadius}m)`
    };
}

module.exports = {
    calculateDistance,
    validateLocation
};
