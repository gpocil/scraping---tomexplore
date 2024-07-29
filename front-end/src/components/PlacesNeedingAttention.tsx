import React, { useState, useEffect } from 'react';
import { usePlaces } from '../context/PlacesContext';
import { IPlace } from '../model/Interfaces';
import { useNavigate, Link } from 'react-router-dom';

const PlacesNeedingAttention: React.FC = () => {
    const { data: places } = usePlaces();
    const [placesNeedingAttention, setPlacesNeedingAttention] = useState<IPlace[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlacesNeedingAttention = () => {
            const needingAttention: IPlace[] = [];

            console.log('Starting to fetch places needing attention...');
            console.log('Places data:', places);

            for (const country of Object.keys(places.needs_attention)) {
                console.log('Country:', country);
                for (const city of Object.keys(places.needs_attention[country])) {
                    console.log('City:', city);
                    for (const place of Object.values(places.needs_attention[country][city]).flat()) {
                        console.log('Place:', place);
                        needingAttention.push(place);
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
            <h1 className="mb-4 text-center">Lieux nécessitant une attention</h1>
            {placesNeedingAttention.length === 0 ? (
                <p>Aucun lieu pour le moment</p>
            ) : (
                <ul className="list-group">
                    {placesNeedingAttention.map(place => (
                        <li key={place.place_id} className="list-group-item">
                            <Link to={`/check-place/${place.place_id}`}>
                                {place.place_id} - {place.place_name}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PlacesNeedingAttention;
