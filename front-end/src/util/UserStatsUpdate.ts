import apiClient from './apiClient';

export const updatePlaceStart = async (placeId: number, userId: number): Promise<void> => {
    console.log('START')

    try {
        const response = await apiClient.post('front/placeStart', { placeId, userId });
        if (response.status === 200) {
            console.log('Place started successfully:', response.data);
        } else {
            console.error('Failed to start place:', response.data);
        }
    } catch (error) {
        console.error('Error updating place start:', error);
    }
};

export const updatePlaceEnd = async (placeId: number): Promise<void> => {
    console.log('END')
    try {
        const response = await apiClient.post('front/placeEnd', { placeId });
        if (response.status === 200) {
            console.log('Place ended successfully:', response.data);
        } else {
            console.error('Failed to end place:', response.data);
        }
    } catch (error) {
        console.error('Error updating place end:', error);
    }
};

export const updatePlaceAbort = async (placeId: number): Promise<void> => {
    console.log('ABORT')

    try {
        const response = await apiClient.post('front/placeAbort', { placeId });
        if (response.status === 200) {
            console.log('Place aborted successfully:', response.data);
        } else {
            console.error('Failed to abort place:', response.data);
        }
    } catch (error) {
        console.error('Error updating place abort:', error);
    }
};
