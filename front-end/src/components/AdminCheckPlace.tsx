import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { IPlace } from '../model/Interfaces';
import { Spinner } from 'react-bootstrap';

const AdminCheckPlace: React.FC = () => {
    const { placeId } = useParams<{ placeId: string }>();
    const { findPlaceById } = usePlaces();
    const navigate = useNavigate();
    const [place, setPlace] = useState<IPlace | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        console.log('Place ID from URL:', placeId);

        if (!placeId) {
            console.warn('No place ID found in URL, redirecting to admin');
            navigate('/admin');
            return;
        }

        // Ajouter un délai de 1 seconde avant de chercher la place
        const timeoutId = setTimeout(() => {
            const foundPlace = findPlaceById(Number(placeId));
            console.log('Found place from context:', foundPlace);

            if (foundPlace) {
                setPlace(foundPlace);
            } else {
                console.error('Place not found in context');
                navigate('/admin');
            }

            setLoading(false);
        }, 1000); // Délai de 1 seconde

        return () => clearTimeout(timeoutId); // Nettoyage du timeout lorsque le composant est démonté
    }, [placeId, findPlaceById, navigate]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" role="status">
                    <span className="sr-only">Loading...</span>
                </Spinner>
            </div>
        );
    }

    if (!place) {
        console.error('Place state is null or undefined');
        return <div>Error: No place found.</div>;
    }

    console.log('Displaying place:', place); // Log pour voir les données du lieu juste avant de les afficher

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>{place.place_name}</h2>
                <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
                    Retour à l'admin
                </button>
            </div>
            <h4 className="mb-4">{place?.place_name} - {place?.type === 'Business' ? '🍺🍽️ Bar/Restaurant' : '🏛️ Attraction touristique'}</h4>
            <h5 className="mb-4">Nom original : {place?.place_name_original}</h5>

            <div className="card">
                <div className="row no-gutters">
                    <div className="col-md-8" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <div className="card-body">
                            <div className="row image-grid">
                                {place?.images?.map((image) => (
                                    <div key={image.id} className="col-4 mb-3 image-container">
                                        <img src={image.url} alt={image.image_name ?? 'Image'} className="img-fluid" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4 d-flex flex-column" style={{ height: '70vh' }}>
                        <div className="flex-grow-1 mb-3 w-100" style={{ height: '80%' }}>
                            <div className="embed-responsive embed-responsive-16by9 h-100 w-100">
                                {place.type === 'Business' ? (
                                    place.instagram_link ? (
                                        <iframe
                                            className="embed-responsive-item h-100 w-100"
                                            src={`${place.instagram_link}/embed`}
                                            title="Instagram"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className="h-100 d-flex align-items-center justify-content-center">
                                            <h4>🚨 Pas d'Instagram trouvé</h4>
                                        </div>
                                    )
                                ) : (
                                    <iframe
                                        className="embed-responsive-item h-100 w-100"
                                        src={place?.wikipedia_link}
                                        title="Wikipedia"
                                        allowFullScreen
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex-grow-2 w-100" style={{ height: '10%' }}>
                            <div className="embed-responsive embed-responsive-16by9 h-100 w-100">
                                {place?.google_maps_link ? (
                                    <a
                                        className="btn btn-primary h-100 w-100 d-flex align-items-center justify-content-center"
                                        href={place.google_maps_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Google Maps
                                    </a>
                                ) : (
                                    <div className="h-100 d-flex align-items-center justify-content-center">
                                        No Google Maps link available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCheckPlace;
