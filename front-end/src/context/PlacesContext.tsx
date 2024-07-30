import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace } from '../model/Interfaces';

interface PlaceContextType {
    data: IResponseStructure;
    updatePlaces: () => void;
    findPlaceById: (placeId: number) => IPlace | undefined;
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<IResponseStructure>({ checked: {}, unchecked: {}, needs_attention: {} });

    const fetchData = useCallback(() => {
        apiClient.get<IResponseStructure>('/front/getAllImages')
            .then((response) => {
                setData(response.data);
                console.log('Fetched places data:', response.data);
            })
            .catch((error) => console.error('Error fetching places:', error));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const findPlaceById = (placeId: number): IPlace | undefined => {
        console.log('Searching for place with ID:', placeId);
        for (const status of ['unchecked', 'needs_attention'] as const) {
            console.log(`Checking status: ${status}`);
            for (const country of Object.keys(data[status])) {
                console.log(`Checking country: ${country}`);
                for (const city of Object.keys(data[status][country])) {
                    console.log(`Checking city: ${city}`);
                    const cityPlaces = data[status][country][city] as unknown as Record<string, IPlace[]>;
                    console.log(`Checking places in ${status} -> ${country} -> ${city}`, cityPlaces);
                    for (const placeKey of Object.keys(cityPlaces)) {
                        const placeArray: IPlace[] = cityPlaces[placeKey];
                        console.log(`Checking place array for key ${placeKey}:`, placeArray);
                        if (Array.isArray(placeArray)) {
                            const foundPlace = placeArray.find((p: IPlace) => {
                                const match = p.place_id === placeId;
                                console.log(`Comparing place_id ${p.place_id} with ${placeId}: ${match}`);
                                return match;
                            });
                            if (foundPlace) {
                                console.log('Found place:', foundPlace);
                                return foundPlace;
                            }
                        } else {
                            console.error(`Expected array but got:`, placeArray);
                        }
                    }
                }
            }
        }
        console.log('Place not found for ID:', placeId);
        return undefined;
    };

    const updatePlaces = () => {
        fetchData();
    };

    return (
        <PlaceContext.Provider value={{ data, updatePlaces, findPlaceById }}>
            {children}
        </PlaceContext.Provider>
    );
};

export const usePlaces = () => {
    const context = useContext(PlaceContext);
    if (context === undefined) {
        throw new Error('usePlaces must be used within a PlaceProvider');
    }
    return context;
};
