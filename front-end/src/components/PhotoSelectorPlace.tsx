import React, { useState, useEffect } from 'react';
import { IPlace, IImage } from '../model/Interfaces';
import './styles/PhotoSelectorCity.css';
import apiClient from '../util/apiClient';
import { useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { useUser } from '../context/UserContext';
import NeedsAttentionDetails from './modals/NeedsAttentionModal';
import { Spinner } from 'react-bootstrap';
import { updatePlaceStart, updatePlaceEnd, updatePlaceAbort } from '../util/UserStatsUpdate';

interface PhotoSelectorPlaceProps {
    place: IPlace;
    onComplete: () => void;
}

const PhotoSelectorPlace: React.FC<PhotoSelectorPlaceProps> = ({ place, onComplete }) => {
    const navigate = useNavigate();
    const { updateSinglePlace } = usePlaces();
    const { checkCookie } = useUser();
    const [selectedImages, setSelectedImages] = useState<IImage[]>([]);
    const [topImages, setTopImages] = useState<IImage[]>([]);
    const [isStepOne, setIsStepOne] = useState(true);
    const [isPlaceComplete, setIsPlaceComplete] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showInstagramInput, setShowInstagramInput] = useState(false);
    const [instagramLink, setInstagramLink] = useState(place?.instagram_link || '');
    const [isScraping, setIsScraping] = useState(false);
    const user = useUser().user;
    const [displayedImages, setDisplayedImages] = useState<IImage[]>([]);

    useEffect(() => {
        if (!checkCookie()) {
            navigate('/login');
        }
    }, [checkCookie, navigate]);

    useEffect(() => {
        if (place) {
            setDisplayedImages(place.images.slice(0, 15));
        }
    }, [place]);

    useEffect(() => {
        setInstagramLink(place?.instagram_link || '');
    }, [place]);

    const totalImages = place?.images?.length || 0;

    useEffect(() => {
        if (user) {
            updatePlaceStart(place.place_id, user?.userId);
        }
    }, [user, place]);

    useEffect(() => {
        if (!isScraping) {
            updateSinglePlace(place.place_id);
        }
    }, [isScraping]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (place) {
                updatePlaceAbort(place.place_id);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [place]);

    const remainingImagesCount = (): number => {
        return totalImages - selectedImages.length;
    };

    const handleImageClick = (image: IImage) => {
        if (isStepOne) {
            setSelectedImages((prevSelectedImages) => {
                const isSelected = prevSelectedImages.some((img) => img.id === image.id);
                if (isSelected) {
                    return prevSelectedImages.filter((img) => img.id !== image.id);
                } else {
                    return [...prevSelectedImages, image];
                }
            });
        } else {
            setTopImages((prevTopImages) => {
                const isSelected = prevTopImages.some((img) => img.id === image.id);
                if (isSelected) {
                    return prevTopImages.filter((img) => img.id !== image.id);
                } else {
                    return prevTopImages.length < 3 ? [...prevTopImages, image] : prevTopImages;
                }
            });
        }
    };

    const handleDeleteImages = async () => {
        try {
            const response = await apiClient.post('/front/deleteImages', {
                imageIds: selectedImages.map((image) => image.id),
                place_id: place?.place_id
            });

            if (response.status === 200) {
                setSelectedImages([]);
                place.images = place.images.filter(
                    (image) => !selectedImages.some((selectedImage) => selectedImage.id === image.id)
                );

                const updatedDisplayedImages = place.images.slice(0, 15);
                setDisplayedImages(updatedDisplayedImages);

                if (updatedDisplayedImages.length === 0) {
                    await handleValidateImages();
                }
            }
        } catch (error) {
            console.error('Error deleting images:', error);
            alert('Failed to delete images');
        }
    };

    const handleValidateImages = async () => {
        try {
            const unseenImageIds = place?.images.slice(15).map((image) => image.id) || [];
            if (unseenImageIds.length > 0) {
                await apiClient.post('/front/deleteImages', {
                    imageIds: unseenImageIds,
                    place_id: place?.place_id
                });
            }
            onComplete();
        } catch (error) {
            console.error('Error validating images:', error);
            alert('Failed to validate images');
        }
    };
    const handleStepTwoTransition = () => {
        if (displayedImages.length > 0) {
            setIsStepOne(false);
        }
    };
    const handleSelectTop = async () => {
        try {
            const response = await apiClient.post('/front/setTop', {
                imageIds: topImages.map((image) => image.id),
                place_id: place?.place_id
            });
            if (response.status === 200) {
                updatePlaceEnd(place.place_id);
                setTopImages([]);
                setIsStepOne(true);
                setIsPlaceComplete(true);
                await updateSinglePlace(place.place_id);
            }
        } catch (error) {
            console.error('Error setting top images:', error);
            alert('Failed to set top images');
        }
    };

    const handleSetNeedsAttention = () => {
        updatePlaceAbort(place.place_id);
        setShowModal(true);
    };

    const handleModalSubmit = async (details: string) => {
        try {
            const response = await apiClient.put('/front/setNeedsAttention', {
                place_id: place?.place_id,
                details: details
            });
            if (response.status === 200) {
                setIsPlaceComplete(true);
                await updateSinglePlace(place.place_id);
            }
        } catch (error) {
            console.error('Error setting as needing attention:', error);
            alert('Failed to set needing attention');
        } finally {
            setShowModal(false);
        }
    };

    const generateGoogleSearchUrl = (placeName: string): string => {
        const query = `${placeName} instagram`.replace(/\s+/g, '+');
        return `https://www.google.com/search?q=${query}`;
    };

    const handleInstagramUpdate = async () => {
        setIsScraping(true);
        try {
            const response = await apiClient.post('/front/updateInstagram', {
                place_id: place?.place_id,
                instagram_link: instagramLink
            });

            if (response.status === 200) {
                alert('Images Instagram récupérées');
                await updateSinglePlace(place.place_id);
            }
        } catch (error) {
            console.error('Error updating Instagram:', error);
            alert('Failed to update Instagram');
        } finally {
            setIsScraping(false);
        }
    };

    if (isPlaceComplete) {
        updateSinglePlace(place.place_id);
        return (
            <div className="container mt-5 text-center">
                <h1>Lieu terminé 🥂</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        updatePlaceAbort(place.place_id);
                        onComplete();
                    }}
                    disabled={isScraping}
                >
                    🏠 Accueil
                </button>
            </div>
        );
    }

    if (!place) {
        return <div>Error: No place found.</div>;
    }

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
                    🏠 Accueil
                </button>
                <h2>{place.place_name}</h2>
            </div>
            <h4 className="mb-4">{place?.place_name} - {place?.type === 'Business' ? '🍺🍽️ Bar/Restaurant' : '🏛️ Attraction touristique'}</h4>
            <h5 className="mb-4">Nom original : {place?.place_name_original}</h5>

            <span className="mb-3" style={{ fontSize: '1.5em' }}>
                {place?.type === 'Business' ? '🍺🍽️ Bar/Restaurant' : '🏛️ Attraction touristique'}
            </span>

            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-center">
                    <h4>{isStepOne ? '🗑️ Supprimer les images' : '⭐ Sélectionner le top 3'}</h4>
                </div>
                <div className="mt-4">
                    <button className="btn btn-warning mt-3" onClick={handleSetNeedsAttention}>
                        ❌ Problème avec ce lieu
                    </button>
                    {isStepOne ? (
                        <div className="mt-3">
                            {selectedImages.length > 0 ? (
                                <button
                                    className="btn btn-danger mt-3"
                                    onClick={handleDeleteImages}
                                    disabled={isScraping}
                                >
                                    Supprimer les images ❌
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary mt-3"
                                    onClick={() => {
                                        if (remainingImagesCount() <= 15) {
                                            handleStepTwoTransition();  // Passe à l'étape suivante si aucune image à supprimer
                                        }
                                    }}
                                    disabled={isScraping}
                                >
                                    Aucune image à supprimer 👍
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            className="btn btn-primary mt-3"
                            onClick={handleSelectTop}
                            disabled={topImages.length !== 3 || isScraping}
                        >
                            Confirmer le Top 3 & Lieu suivant ✅
                        </button>
                    )}

                </div>
            </div>

            <div className="card">
                <div className="row no-gutters">
                    <div className="col-md-8" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <div className="card-body">
                            <div className="row image-grid">
                                {displayedImages.map((image) => {
                                    const isSelectedDelete = selectedImages.some((img) => img.id === image.id);
                                    const isSelectedTop = topImages.some((img) => img.id === image.id);
                                    const containerClassName = `col-4 mb-3 image-container 
            ${isSelectedDelete ? 'selected-delete' : ''} 
            ${isSelectedTop ? 'selected-top' : ''}`;

                                    return (
                                        <div
                                            key={image.id}
                                            className={containerClassName}
                                            onClick={() => handleImageClick(image)}
                                        >
                                            <img src={image.url} loading='lazy' alt={image.image_name ?? 'Image'} className="img-fluid" />
                                            {(isSelectedDelete || isSelectedTop) && (
                                                <div className="selected-overlay">
                                                    {isSelectedDelete ? '✓' : topImages.indexOf(image) + 1}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
                                        <div className="h-100 d-flex flex-column align-items-center justify-content-center">
                                            <h4>🚨 Pas d'Instagram trouvé</h4>
                                            <button
                                                className="btn btn-secondary mt-3"
                                                onClick={() => {
                                                    const url = generateGoogleSearchUrl(place.place_name);
                                                    window.open(url, '_blank');
                                                }}
                                            >
                                                📷 Rechercher Instagram
                                            </button>
                                            <button
                                                className="btn btn-secondary mt-3"
                                                onClick={() => setShowInstagramInput(!showInstagramInput)}
                                            >
                                                {showInstagramInput ? '❌ Annuler' : '📸 Mettre à jour Instagram'}
                                            </button>
                                            {showInstagramInput && (
                                                <div className="mt-3">
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={instagramLink}
                                                        onChange={(e) => setInstagramLink(e.target.value)}
                                                        placeholder="Enter new Instagram link"
                                                    />
                                                    <button
                                                        className="btn btn-primary mt-3"
                                                        onClick={handleInstagramUpdate}
                                                        disabled={isScraping}
                                                    >
                                                        {isScraping ? (
                                                            <div className="d-flex align-items-center">
                                                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                                                <span className="ml-2">⚠️ Recherche en cours, patienter !</span>
                                                            </div>
                                                        ) : (
                                                            'Mettre à jour Instagram'
                                                        )}
                                                    </button>
                                                </div>
                                            )}
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

            <NeedsAttentionDetails
                show={showModal}
                onHide={() => setShowModal(false)}
                onSubmit={handleModalSubmit}
            />
        </div>
    );
};

export default PhotoSelectorPlace;
