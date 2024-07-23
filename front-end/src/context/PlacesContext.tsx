import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import apiClient from '../util/apiClient';
import { IResponseStructure } from '../model/Interfaces';

interface PlaceContextType {
    data: IResponseStructure;
    updatePlaces: () => void;
}

// Create context
const PlaceContext = createContext<PlaceContextType | undefined>(undefined);

export const PlaceProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<IResponseStructure>({});

    const fetchData = () => {
        apiClient.get<IResponseStructure>('/front/getAllImages')
            .then((response) => {
                setData(response.data);
                console.log('Fetched places data:', response.data);  // Add this line to log the data
            })
            .catch((error) => console.error('Error fetching places:', error));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const updatePlaces = () => {
        fetchData();
    };

    return (
        <PlaceContext.Provider value={{ data, updatePlaces }}>
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
