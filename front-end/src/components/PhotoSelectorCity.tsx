import React, { useEffect, useState } from 'react';
import { IPlace, IImage } from '../model/Interfaces';
import './styles/PhotoSelectorCity.css';
import apiClient from '../util/apiClient';
import { useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { useUser } from '../context/UserContext';
import NeedsAttentionDetails from './modals/NeedsAttentionModal'; // Import du modal
import { Spinner } from 'react-bootstrap';
import { updatePlaceStart, updatePlaceEnd, updatePlaceAbort } from '../util/UserStatsUpdate';

interface PhotoSelectorCityProps {
    places: IPlace[];
    cityName: string;
}

const PhotoSelectorCity: React.FC<PhotoSelectorCityProps> = ({ places, cityName }) => {
    const navigate = useNavigate();
    const { checkCookie } = useUser();
    const { updatePlaces } = usePlaces();
    const [currentPlaceId, setCurrentPlaceId] = useState(places[0]?.place_id);
    const [selectedImages, setSelectedImages] = useState<IImage[]>([]);
    const [topImages, setTopImages] = useState<IImage[]>([]);
    const [isStepOne, setIsStepOne] = useState(true);
    const [isCityComplete, setIsCityComplete] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showInstagramInput, setShowInstagramInput] = useState(false);
    const [instagramLink, setInstagramLink] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const currentPlace = places.find((place) => place.place_id === currentPlaceId);
    const totalImages = currentPlace?.images?.length || 0;
    const user = useUser().user;
    const [displayedImages, setDisplayedImages] = useState<IImage[]>([]);



    useEffect(() => {
        if (!checkCookie()) {
            navigate('/login');
        }
    }, [checkCookie, navigate]);

    useEffect(() => {
        if (!isScraping && user) {
            updatePlaces(user?.admin);
        }
    }, [isScraping]);

    useEffect(() => {
        const currentPlaceExists = places.some((place) => place.place_id === currentPlaceId);
        if (!currentPlaceExists) {
            if (places.length > 0) {
                setCurrentPlaceId(places[0].place_id);
            } else {
                setIsCityComplete(true);
            }
        }
    }, [places, currentPlaceId]);

    useEffect(() => {
        if (currentPlace) {
            const sortedImages = currentPlace.images.slice().sort((a, b) => {
                const sourceOrder = ['Instagram', 'Google', 'Wikimedia', 'Unsplash', null];
                const sourceA = sourceOrder.indexOf(a.source);
                const sourceB = sourceOrder.indexOf(b.source);
                return sourceA - sourceB;
            });
   
            setDisplayedImages(sortedImages.slice(0, 15));
        }
    }, [currentPlace]);
    
    
    


    useEffect(() => {
        const handleBeforeUnload = () => {
            if (currentPlace && !isCityComplete) {
                updatePlaceAbort(currentPlace.place_id);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentPlace, isCityComplete]);


    useEffect(() => {
        setInstagramLink(currentPlace?.instagram_link || '');
    }, [currentPlace?.instagram_link]);

    useEffect(() => {
        if (user && currentPlace) {
            updatePlaceStart(currentPlace.place_id, user?.userId);
            console.log('start');
        }
    }, [currentPlace, user]);

    const handleNext = () => {
        const currentIndex = places.findIndex((place) => place.place_id === currentPlaceId);
        if (currentIndex < places.length - 1) {
            setCurrentPlaceId(places[currentIndex + 1].place_id);
            resetSelection();
        } else {
            setIsCityComplete(true);
        }
    };

    const handlePrev = () => {
        const currentIndex = places.findIndex((place) => place.place_id === currentPlaceId);
        if (currentIndex > 0) {
            updatePlaceAbort(currentPlaceId);
            setCurrentPlaceId(places[currentIndex - 1].place_id);
            resetSelection();
        }
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
                place_id: currentPlace?.place_id
            });

            if (response.status === 200 && currentPlace) {
                currentPlace.images = currentPlace.images.filter(
                    (image) => !selectedImages.some((selectedImage) => selectedImage.id === image.id)
                );

                const updatedDisplayedImages = currentPlace.images.slice(0, 15);
                setDisplayedImages(updatedDisplayedImages);
                setSelectedImages([]);
                if (updatedDisplayedImages.length === 0) {
                    await handleValidateImages();
                }
            }
        } catch (error) {
            console.error('Error deleting images:', error);
            alert('Failed to delete images');
        }
    };

    const handleStepTwoTransition = () => {
            setIsStepOne(false);
        
    };


    const handleValidateImages = async () => {
        try {
            const unseenImageIds = currentPlace?.images.slice(15).map((image) => image.id) || [];
            if (unseenImageIds.length > 0) {
                await apiClient.post('/front/deleteImages', {
                    imageIds: unseenImageIds,
                    place_id: currentPlace?.place_id
                });
            }
            handleNext();
        } catch (error) {
            console.error('Error validating images:', error);
            alert('Failed to validate images');
        }
    };

    const handleSelectTop = async () => {
        try {
            const response = await apiClient.post('/front/setTop', {
                imageIds: topImages.map((image) => image.id),
                place_id: currentPlace?.place_id
            });
            if (response.status === 200 && currentPlace) {
                updatePlaceEnd(currentPlace.place_id);
                setTopImages([]);
                setIsStepOne(true);
                handleNext();
            }
        } catch (error) {
            console.error('Error setting top images:', error);
            alert('Failed to set top images');
        }
    };

    const handleSetNeedsAttention = () => {
        updatePlaceAbort(currentPlaceId);
        setShowModal(true);
    };

    const handleModalSubmit = async (details: string) => {
        try {
            const response = await apiClient.put('/front/setNeedsAttention', {
                place_id: currentPlace?.place_id,
                details: details
            });
            if (response.status === 200) {
                handleNext();
            }
        } catch (error) {
            console.error('Error setting as needing attention:', error);
            alert('Failed to set needing attention');
        } finally {
            setShowModal(false);
        }
    };

    const resetSelection = () => {
        setSelectedImages([]);
        setTopImages([]);
        setIsStepOne(true);
    };

    const generateGoogleSearchUrl = (placeName: string, cityName: string): string => {
        const query = `${placeName} ${cityName} instagram`.replace(/\s+/g, '+');
        return `https://www.google.com/search?q=${query}`;
    };

    const handleInstagramUpdate = async () => {
        setIsScraping(true);
        try {
            const response = await apiClient.post('/front/updateInstagram', {
                place_id: currentPlace?.place_id,
                instagram_link: instagramLink
            });

            if (response.status === 200) {
                alert('Images Instagram récupérées');
            }
        } catch (error) {
            console.error('Error updating Instagram:', error);
            alert('Failed to update Instagram');
        } finally {
            setIsScraping(false);
        }
    };

    if (!cityName) {
        return <div>Error: Invalid city name.</div>;
    }

    if (places.length === 0) {
        return <div>Error: No places found for the given city.</div>;
    }

    if (isCityComplete) {
        return (
            <div className="container mt-5 text-center">
                <h1>Ville terminée 🥂</h1>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/')} disabled={isScraping}>
                    🏠 Accueil
                </button>
            </div>
        );
    }

    const currentIndex = places.findIndex((place) => place.place_id === currentPlaceId);

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        updatePlaceAbort(currentPlaceId);
                        navigate('/');
                    }}
                    disabled={isScraping}
                >
                    🏠 Accueil

                </button>

                <h2>{cityName}</h2>
            </div>
            <h4 className="mb-4">{currentPlace?.place_name} - {currentPlace?.type === 'Business' ? '🍺🍽️ Bar/Restaurant' : '🏛️ Attraction touristique'}</h4>
            <h5 className="mb-4">Nom original : {currentPlace?.place_name_original}</h5>

            <span className="mb-3" style={{ fontSize: '1.5em' }}>
            </span>

            <div className="d-flex justify-content-between align-items-center mb-3">
                <button className="btn btn-secondary" onClick={handlePrev} disabled={currentIndex === 0 || isScraping} >
                    ⬅️ Précédent
                </button>
                <div className="text-center">
                    <h4>
                        {currentIndex + 1} / {places.length}
                    </h4>
                    <h3 className={`mb-4 ${isStepOne ? 'text-danger' : 'text-primary'}`}>
                        {isStepOne ? '🗑️ Supprimer les images' : '⭐ Sélectionner le top 3'}
                    </h3>
                </div>
                <div className="mt-4">
                    <button className="btn btn-warning mt-3" onClick={handleSetNeedsAttention} disabled={isScraping}>
                        ❌ Problème avec ce lieu
                    </button>
                    {isStepOne ? (
                        <div className="mt-3">
                            {selectedImages.length > 0 ? (
                                <button className="btn btn-danger mt-3" onClick={handleDeleteImages} disabled={isScraping}>
                                    Supprimer les images ❌
                                </button>
                            ) : (
                                <button className="btn btn-primary mt-3" onClick={handleStepTwoTransition} disabled={isScraping}>
                                    Aucune image à supprimer 👍
                                </button>
                            )}
                        </div>

                    )
                        : (
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
                                            <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>{image.source}</span>
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
                                {currentPlace?.type === 'Business' ? (
                                    currentPlace.instagram_link ? (
                                        <iframe
                                            className="embed-responsive-item h-100 w-100"
                                            src={`${currentPlace.instagram_link}/embed`}
                                            title="Instagram"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className="h-100 d-flex flex-column align-items-center justify-content-center">
                                            <h4>🚨 Pas d'Instagram trouvé</h4>
                                            <button
                                                className="btn btn-secondary mt-3"
                                                onClick={() => {
                                                    const url = generateGoogleSearchUrl(currentPlace.place_name, cityName);
                                                    window.open(url, '_blank');
                                                }}
                                                disabled={isScraping}
                                            >
                                                📷 Rechercher Instagram
                                            </button>
                                            <button
                                                className="btn btn-secondary mt-3"
                                                onClick={() => setShowInstagramInput(!showInstagramInput)}
                                                disabled={isScraping}
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
                                        src={currentPlace?.wikipedia_link}
                                        title="Wikipedia"
                                        allowFullScreen
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex-grow-2 w-100" style={{ height: '10%' }}>
                            <div className="embed-responsive embed-responsive-16by9 h-100 w-100">
                                {currentPlace?.google_maps_link ? (
                                    <a
                                        className="btn btn-primary h-100 w-100 d-flex align-items-center justify-content-center"
                                        href={currentPlace.google_maps_link}
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

export default PhotoSelectorCity;
