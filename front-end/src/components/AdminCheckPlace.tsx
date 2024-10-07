import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import apiClient from '../util/apiClient';

interface ImageResponse {
    image_name: string;
    id: number;
    url: string;
    top?: number;
}

interface PlaceResponse {
    place_id: number;
    name_eng: string;
    name_eng_original?: string;
    wikipedia_link?: string;
    google_maps_link: string;
    instagram_link?: string;
    images: ImageResponse[];
    type?: string;
}

const AdminCheckPlace: React.FC = () => {
    const { placeId } = useParams<{ placeId: string }>();
    const navigate = useNavigate();
    const [place, setPlace] = useState<PlaceResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!placeId) {
            console.warn('No place ID found in URL, redirecting to admin');
            navigate('/admin');
            return;
        }

        const fetchPlaceData = async () => {
            try {
                const response = await apiClient.get<{ place: PlaceResponse; images: ImageResponse[] }>(`front/getPlace/${placeId}`);
                const { place, images } = response.data;
                setPlace({
                    ...place,
                    images,
                });
            } catch (error) {
                console.error('Error fetching place:', error);
                navigate('/admin');
            } finally {
                setLoading(false);
            }
        };

        fetchPlaceData();
    }, [placeId, navigate]);

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
        return <div>Error: No place found.</div>;
    }

    // Separate and sort top images by their `top` value
    const topImages = place.images.filter(image => image.top).sort((a, b) => (a.top ?? 0) - (b.top ?? 0));
    const otherImages = place.images.filter(image => !image.top);

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>{place.name_eng}</h2>
                <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
                    Retour à l'admin
                </button>
            </div>
            <h4 className="mb-4">{place?.name_eng} - {place?.type === 'Business' ? '🍺🍽️ Bar/Restaurant' : '🏛️ Attraction touristique'}</h4>
            <h5 className="mb-4">Nom original : {place?.name_eng_original}</h5>

            <div className="card">
                <div className="row no-gutters">
                    <div className="col-md-8" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <div className="card-body">
                            {/* Top Images Section */}
                            <div className="mb-4">
                                <h5>Top Images</h5>
                                <div className="row image-grid">
                                    {topImages.map((image) => (
                                        <div key={image.id} className="col-4 mb-3 image-container">
                                            <img src={image.url} alt={image.image_name ?? 'Image'} className="img-fluid" />
                                            <p>Top: {image.top}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Other Images Section */}
                            <h5>Other Images</h5>
                            <div className="row image-grid">
                                {otherImages.map((image) => (
                                    <div key={image.id} className="col-4 mb-3 image-container">
                                        <img src={image.url} alt={image.image_name ?? 'Image'} className="img-fluid" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4 d-flex flex-column" style={{ height: '70vh' }}>
                        {/* Instagram or Wikipedia Section */}
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
