import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import apiClient from '../util/apiClient';

// Typescript types
interface ImageResponse {
    image_name: string;
    original_url: string;
    url: string;
}

interface PlaceResponse {
    place_id: number;
    place_name: string;
    wikipedia_link: string;
    google_maps_link: string;
    images: ImageResponse[];
}

interface CityResponse {
    [placeName: string]: PlaceResponse[];
}

interface CountryResponse {
    [cityName: string]: CityResponse;
}

interface ResponseStructure {
    [countryName: string]: CountryResponse;
}

// Create context
const PlaceContext = createContext<ResponseStructure | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<ResponseStructure>({});

    useEffect(() => {
        // Fetch data from the API using apiClient
        apiClient.get<ResponseStructure>('/getAllImages')
            .then((response: { data: React.SetStateAction<ResponseStructure>; }) => {
                setData(response.data);
                console.log('Fetched places data:', response.data);  // Add this line to log the data
            })
            .catch((error: any) => console.error('Error fetching places:', error));
    }, []);

    return (
        <PlaceContext.Provider value={data}>
            {children}
        </PlaceContext.Provider>
    );
};

// Custom hook to use the PlaceContext
export const usePlaces = () => {
    const context = useContext(PlaceContext);
    if (context === undefined) {
        throw new Error('usePlaces must be used within a PlaceProvider');
    }
    return context;
};
