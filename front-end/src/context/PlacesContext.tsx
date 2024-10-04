import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure, IPlace } from '../model/Interfaces';

interface PlaceContextType {
    data: IResponseStructure;
    updatePlaces: () => void;
    findPlaceById: (placeId: number) => IPlace | undefined;
    updateSinglePlace: (placeId: number) => Promise<void>;
}

const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<IResponseStructure>({ checked: {}, unchecked: {}, needs_attention: {}, to_be_deleted: {} });
    const [placeMap, setPlaceMap] = useState<Map<number, IPlace>>(new Map());

    const buildPlaceMap = (responseData: IResponseStructure) => {
        const newPlaceMap = new Map<number, IPlace>();

        const statuses = ['unchecked', 'needs_attention', 'checked', 'to_be_deleted'] as const;

        statuses.forEach((status) => {
            Object.keys(responseData[status]).forEach((country) => {
                Object.keys(responseData[status][country]).forEach((city) => {
                    const cityPlaces = responseData[status][country][city] as unknown as Record<string, IPlace[]>;
                    Object.values(cityPlaces).forEach((placesArray) => {
                        placesArray.forEach((place) => {
                            newPlaceMap.set(place.place_id, place);
                        });
                    });
                });
            });
        });

        setPlaceMap(newPlaceMap);
    };

    const fetchData = useCallback(() => {
        apiClient.get<IResponseStructure>('/front/getAllImages')
            .then((response) => {
                setData(response.data);
                buildPlaceMap(response.data); // Construire le Map ici
                console.log('Fetched places data and built placeMap:', response.data);
            })
            .catch((error) => console.error('Error fetching places:', error));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const findPlaceById = (placeId: number): IPlace | undefined => {
        return placeMap.get(placeId); // Recherche O(1) avec le Map
    };

    const updatePlaces = () => {
        fetchData();
    };

    const updateSinglePlace = (placeId: number) => {
        console.log('Fetching images for place with ID:', placeId);
        return apiClient.get<IPlace>(`/front/${placeId}/images`)
            .then((response) => {
                const updatedPlace = response.data;
                console.log('Fetched images for place:', updatedPlace);

                setData((prevData) => {
                    const updatedData = { ...prevData };
                    for (const status of ['unchecked', 'needs_attention', 'checked', 'to_be_deleted'] as const) {
                        for (const country of Object.keys(updatedData[status])) {
                            for (const city of Object.keys(updatedData[status][country])) {
                                const cityPlaces = updatedData[status][country][city] as unknown as Record<string, IPlace[]>;
                                for (const placeKey of Object.keys(cityPlaces)) {
                                    const placeArray: IPlace[] = cityPlaces[placeKey];
                                    if (Array.isArray(placeArray)) {
                                        const placeIndex = placeArray.findIndex((p: IPlace) => p.place_id === placeId);
                                        if (placeIndex !== -1) {
                                            cityPlaces[placeKey][placeIndex] = updatedPlace;
                                            console.log('Updated place:', updatedPlace);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    buildPlaceMap(updatedData); // Recréer le Map pour inclure la mise à jour
                    return updatedData;
                });
            })
            .catch((error) => console.error('Error fetching images for place:', error));
    };

    return (
        <PlaceContext.Provider value={{ data, updatePlaces, findPlaceById, updateSinglePlace }}>
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
