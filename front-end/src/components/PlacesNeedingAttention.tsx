import React, { useState, useEffect } from 'react';
import { usePlaces } from '../context/PlacesContext';
import { IPlace } from '../model/Interfaces';
import { useNavigate } from 'react-router-dom';

const PlacesNeedingAttention: React.FC = () => {
    const { data: places } = usePlaces();
    const [placesNeedingAttention, setPlacesNeedingAttention] = useState<IPlace[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlacesNeedingAttention = () => {
            const needingAttention: IPlace[] = [];

            console.log('Starting to fetch places needing attention...');
            console.log('Places data:', places);

            for (const country of Object.keys(places.unchecked)) {
                console.log('Country:', country);
                for (const city of Object.keys(places.unchecked[country])) {
                    console.log('City:', city);
                    for (const place of Object.values(places.unchecked[country][city]).flat()) {
                        console.log('Place:', place);
                        if (place.needs_attention) {
                            console.log('Adding place needing attention:', place);
                            needingAttention.push(place);
                        }
                    }
                }
            }

            console.log('Places needing attention:', needingAttention);
            setPlacesNeedingAttention(needingAttention);
        };
        fetchPlacesNeedingAttention();
    }, [places]);
    return (
        <div className="container mt-5">
            <button className="btn btn-primary" onClick={() => navigate('/')}>
                Home
            </button>
            <h1 className="mb-4 text-center">Lieux à vérifier</h1>
            {placesNeedingAttention.length === 0 ? (
                <p>Aucun lieu pour le moment</p>
            ) : (
                <ul className="list-group">
                    {placesNeedingAttention.map(place => (
                        <li key={place.place_id} className="list-group-item">
                            {place.place_id} - {place.place_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PlacesNeedingAttention;
