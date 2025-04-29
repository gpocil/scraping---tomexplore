import apiClient from './apiClient';

// Track which places have been started to prevent duplicate API calls
const startedPlaces = new Set<number>();
const endedPlaces = new Set<number>();
const abortedPlaces = new Set<number>();

// Debounce control
let debounceTimers: { [placeId: number]: NodeJS.Timeout } = {};

export const updatePlaceStart = async (placeId: number, userId: number) => {
    // Don't make API call if already started and not ended/aborted
    if (startedPlaces.has(placeId) &&
        !endedPlaces.has(placeId) &&
        !abortedPlaces.has(placeId)) {
        return;
    }

    // Validate inputs
    if (!placeId || !userId) {
        console.error('Invalid parameters for updatePlaceStart:', { placeId, userId });
        return;
    }

    // Clear any existing debounce timer
    if (debounceTimers[placeId]) {
        clearTimeout(debounceTimers[placeId]);
    }

    // Set a debounce timer to prevent rapid successive calls
    debounceTimers[placeId] = setTimeout(async () => {
        console.log('START', { placeId, userId });
        startedPlaces.add(placeId);
        endedPlaces.delete(placeId);
        abortedPlaces.delete(placeId);

        try {
            const response = await apiClient.post('/front/placeStart', {
                place_id: placeId,
                user_id: userId
            });
            console.log('Place started successfully:', response.data);
        } catch (error) {
            console.error('Error starting place:', error);
            startedPlaces.delete(placeId); // Allow retry on error
        }
    }, 300); // 300ms debounce
};

export const updatePlaceEnd = async (placeId: number) => {
    if (!placeId) {
        console.error('Invalid placeId for updatePlaceEnd:', placeId);
        return;
    }

    // Clear any existing debounce timer
    if (debounceTimers[placeId]) {
        clearTimeout(debounceTimers[placeId]);
    }

    try {
        const response = await apiClient.post('/front/placeEnd', {
            place_id: placeId
        });
        startedPlaces.delete(placeId);
        endedPlaces.add(placeId);
        abortedPlaces.delete(placeId);
        console.log('Place ended successfully:', response.data);
    } catch (error) {
        console.error('Error ending place:', error);
    }
};

export const updatePlaceAbort = async (placeId: number) => {
    if (!placeId) {
        console.error('Invalid placeId for updatePlaceAbort:', placeId);
        return;
    }

    // Don't make API call if not started
    if (!startedPlaces.has(placeId)) {
        return;
    }

    // Clear any existing debounce timer
    if (debounceTimers[placeId]) {
        clearTimeout(debounceTimers[placeId]);
    }

    try {
        const response = await apiClient.post('/front/placeAbort', {
            place_id: placeId
        });
        startedPlaces.delete(placeId);
        endedPlaces.delete(placeId);
        abortedPlaces.add(placeId);
        console.log('Place aborted successfully:', response.data);
    } catch (error) {
        console.error('Error aborting place:', error);
    }
};
