import React, { useState, useEffect } from 'react';
import { IPlace, IImage } from '../model/Interfaces';
import './styles/PhotoSelectorCity.css';
import apiClient from '../util/apiClient';
import { useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { useUser } from '../context/UserContext';
import NeedsAttentionDetails from './modals/NeedsAttentionModal'; // Import du modal
import { Spinner } from 'react-bootstrap';
import { updatePlaceStart, updatePlaceEnd, updatePlaceAbort } from '../util/UserStatsUpdate';

interface PhotoSelectorPlaceProps {
    place: IPlace;
    onComplete: () => void;
}

const PhotoSelectorPlace: React.FC<PhotoSelectorPlaceProps> = ({ place, onComplete }) => {
    const navigate = useNavigate();
    const { updateSinglePlace } = usePlaces();  // Get the function to update cache
    const { checkCookie } = useUser();
    const [selectedImages, setSelectedImages] = useState<IImage[]>([]);
    const [topImages, setTopImages] = useState<IImage[]>([]);
    const [isStepOne, setIsStepOne] = useState(true);
    const [isPlaceComplete, setIsPlaceComplete] = useState(false);
    const [showModal, setShowModal] = useState(false); // Modal state for needs attention
    const [showInstagramInput, setShowInstagramInput] = useState(false);
    const [instagramLink, setInstagramLink] = useState(place?.instagram_link || '');
    const [isScraping, setIsScraping] = useState(false);
    const user = useUser().user;

    // Effect to ensure the user is logged in, otherwise redirect to login
    useEffect(() => {
        if (!checkCookie()) {
            navigate('/login');
        }
    }, [checkCookie, navigate]);

    // Set the Instagram link when the place data changes
    useEffect(() => {
        setInstagramLink(place?.instagram_link || '');
    }, [place]);

    const totalImages = place?.images?.length || 0;

    // Start tracking place stats when user is working on a place
    useEffect(() => {
        if (user) {
            updatePlaceStart(place.place_id, user?.userId);
        }
    }, [user, place]);

    // Ensure that updates are made to both the cache and state after scraping or updates
    useEffect(() => {
        if (!isScraping) {
            updateSinglePlace(place.place_id); // Update cache and state after scraping completes
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
                if (remainingImagesCount() <= 15) {
                    setIsStepOne(false);
                }
                // Update cache and state after image deletion
                await updateSinglePlace(place.place_id);
            }
        } catch (error) {
            console.error('Error deleting images:', error);
            alert('Failed to delete images');
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
                // Update cache and state after setting top images
                await updateSinglePlace(place.place_id);
            }
        } catch (error) {
            console.error('Error setting top images:', error);
            alert('Failed to set top images');
        }
    };

    const handleSetNeedsAttention = () => {
        updatePlaceAbort(place.place_id);
        setShowModal(true);  // Open the modal for setting needs attention
    };

    const handleModalSubmit = async (details: string) => {
        try {
            const response = await apiClient.put('/front/setNeedsAttention', {
                place_id: place?.place_id,
                details: details
            });
            if (response.status === 200) {
                setIsPlaceComplete(true);
                // Update cache and state after setting needs attention
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
                // Update cache and state after Instagram update
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
        updateSinglePlace(place.place_id);  // Ensure the place update is reflected in cache and state
        return (
            <div className="container mt-5 text-center">
                <h1>Lieu terminé 🥂</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        updatePlaceAbort(place.place_id);
                        onComplete();  // Navigate back or mark completion
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
                        totalImages > 15 ? ( // Si plus de 15 images, on force l'utilisateur à en supprimer
                            <div className="mt-3">
                                <p className="text-danger">
                                    Il reste {remainingImagesCount() - 15} photo(s) à supprimer avant de continuer.
                                </p>
                                {selectedImages.length > 0 ? (
                                    <button className="btn btn-danger mt-3" onClick={handleDeleteImages} disabled={isScraping}>
                                        Supprimer les images ❌
                                    </button>
                                ) : (
                                    <button className="btn btn-primary mt-3" disabled>
                                        Sélectionnez des images à supprimer
                                    </button>
                                )}
                            </div>
                        ) : (  // Si 15 images ou moins, on peut en supprimer mais ce n'est pas obligatoire
                            <div className="mt-3">
                                <button className="btn btn-primary mt-3" onClick={() => setIsStepOne(false)} disabled={isScraping}>
                                    Aucune image à supprimer 👍
                                </button>
                                {selectedImages.length > 0 && ( // Si des images sont sélectionnées, permettre leur suppression
                                    <button className="btn btn-danger mt-3" onClick={handleDeleteImages} disabled={isScraping}>
                                        Supprimer les images ❌
                                    </button>
                                )}
                            </div>
                        )
                    ) : (
                        <button
                            className="btn btn-primary mt-3"
                            onClick={handleSelectTop}
                            disabled={totalImages > 3 ? topImages.length !== 3 : topImages.length > 3 || isScraping}
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
                                {place?.images?.map((image) => {
                                    const isSelectedDelete = selectedImages.some((img) => img.id === image.id);
                                    const topIndex = topImages.findIndex((img) => img.id === image.id);
                                    return (
                                        <div
                                            key={image.id}
                                            className={`col-4 mb-3 image-container ${isSelectedDelete
                                                ? 'selected-delete'
                                                : topIndex !== -1
                                                    ? 'selected-top'
                                                    : ''
                                                }`}
                                            onClick={() => handleImageClick(image)}
                                        >
                                            <img src={image.url} alt={image.image_name ?? 'Image'} className="img-fluid" />
                                            {isSelectedDelete && <div className="selected-overlay">✓</div>}
                                            {topIndex !== -1 && <div className="selected-overlay">{topIndex + 1}</div>}
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
