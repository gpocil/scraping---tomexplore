import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IPlace, IImage } from '../model/Interfaces';
import apiClient from '../util/apiClient';
import UploadPhotosModal from './modals/UploadPhotosModal';
import DeletePlaceModal from './modals/DeletePlaceModal';
import { Button, Container, Row, Col, Form, Spinner } from 'react-bootstrap';
import './styles/CheckPlaceNeedsAttention.css';
import { usePlaces } from '../context/PlacesContext';
import { useUser } from '../context/UserContext';

interface CheckPlaceNeedsAttentionProps {
    place: IPlace;
}

const CheckPlaceNeedsAttention: React.FC<CheckPlaceNeedsAttentionProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const place = (location.state as { place: IPlace }).place;
    const { updatePlaces, updateSinglePlace, data: places } = usePlaces();

    const [selectedImages, setSelectedImages] = useState<IImage[]>([]);
    const [topImages, setTopImages] = useState<IImage[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSettingTop, setIsSettingTop] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showInstagramInput, setShowInstagramInput] = useState(false);
    const [instagramLink, setInstagramLink] = useState(place.instagram_link || '');
    const [showWikimediaInput, setShowWikimediaInput] = useState(false);
    const [wikiQuery, setWikiQuery] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const [images, setImages] = useState<IImage[]>(place.images || []);
    const user = useUser().user;
    const [cityName, setCityName] = useState<string | null>(null);

    useEffect(() => {
        console.log('Component mounted');
        return () => {
            console.log('Component unmounted');
        };
    }, []);

    useEffect(() => {
        const findCityForPlace = () => {
            if (places.needs_attention) {
                // Parcourir les pays et les villes dans needs_attention
                for (const country of Object.keys(places.needs_attention)) {
                    for (const city of Object.keys(places.needs_attention[country])) {
                        const cityPlaces = places.needs_attention[country][city];
                        for (const placeArray of Object.values(cityPlaces)) {
                            if (Array.isArray(placeArray)) {
                                for (const placeItem of placeArray) {
                                    if (placeItem.place_id === place.place_id) {
                                        setCityName(city); // Si trouvé, définir le nom de la ville
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        findCityForPlace();
    }, [places, place.place_id]);


    useEffect(() => {
        setImages(place.images);
    }, [place.images]);



    const imagesToDeleteCount = (): number => {
        return totalImages > 15 ? totalImages - 15 : 0;
    };



    const totalImages = images.length || 0;


    const handleImageClick = (image: IImage) => {
        console.log('Image clicked:', image);
        if (isDeleting) {
            setSelectedImages((prevSelectedImages) => {
                const isSelected = prevSelectedImages.some((img) => img.id === image.id);
                const newSelectedImages = isSelected
                    ? prevSelectedImages.filter((img) => img.id !== image.id)
                    : [...prevSelectedImages, image];
                console.log('Updated selectedImages:', newSelectedImages);
                return newSelectedImages;
            });
        } else if (isSettingTop) {
            setTopImages((prevTopImages) => {
                const isSelected = prevTopImages.some((img) => img.id === image.id);
                const newTopImages = isSelected
                    ? prevTopImages.filter((img) => img.id !== image.id)
                    : prevTopImages.length < 3 ? [...prevTopImages, image] : prevTopImages;
                console.log('Updated topImages:', newTopImages);
                return newTopImages;
            });
        }
    };

    const generateGoogleSearchUrl = (placeName: string, cityName: string): string => {
        const wikiQuery = `${placeName} ${cityName} instagram`.replace(/\s+/g, '+');
        return `https://www.google.com/search?q=${wikiQuery}`;
    };
    const handleGoogleRescrape = async () => {
        setIsScraping(true);
        try {
            const response = await apiClient.post('/front/updateGoogle', {
                place_id: place?.place_id
            });

            if (response.status === 200 && user) {
                await updateImages();
                updatePlaces(user?.admin);
                alert('Google Images rescraped successfully');
            }
        } catch (error) {
            console.error('Error scraping Google images:', error);
            alert('Failed to rescrape Google images');
        } finally {
            setIsScraping(false);
        }
    };
    useEffect(() => {
        updateImages();
    }, [place]);

    const handleDeleteImages = async () => {
        try {
            const response = await apiClient.post('/front/deleteImages', {
                imageIds: selectedImages.map((image) => image.id),
                place_id: place?.place_id
            });

            if (response.status === 200) {
                const remainingImages = images.filter(
                    (image) => !selectedImages.some((selectedImage) => selectedImage.id === image.id)
                );

                setImages(remainingImages);
                setSelectedImages([]);
            }
        } catch (error) {
            console.error('Error deleting images:', error);
            alert('Failed to delete images');
        }
    };

    const handleSetTopImages = async () => {
        console.log('Setting top images:', topImages);
        try {
            const response = await apiClient.post('/front/setTop', {
                imageIds: topImages.map((image) => image.id),
                place_id: place?.place_id
            });
            console.log('Set top images response:', response);

            if (response.status === 200) {
                // Update in-memory state and IndexedDB
                updatePlacesAfterValidation(place.place_id);
                setTopImages([]);
                place.checked = true;  // Mark the place as checked in the local state
                handleBackClick(); // Navigate back after validation
            }
        } catch (error) {
            console.error('Error setting top images:', error);
            alert('Failed to set top images');
        }
    };

    // New function to update place status and remove from "needs_attention"
    const updatePlacesAfterValidation = async (placeId: number) => {
        await updateSinglePlace(placeId);  // This will update the cache (IndexedDB) and memory
        if (user)
            updatePlaces(user?.admin);  // Trigger re-fetching the data to refresh the UI
    };


    const handleUploadSubmit = async (files: File[]) => {
        console.log('Uploading files:', files);
        const formData = new FormData();
        files.forEach(file => {
            formData.append('photos', file);
            console.log('Added file to FormData:', file.name);
        });

        const placeId = place.place_id.toString();
        console.log('Added place_id to FormData:', placeId);

        try {
            const response = await apiClient.post(`/front/uploadPhotos/${placeId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Upload response:', response);
            if (response.status === 200) {
                if (user)
                    updatePlaces(user?.admin);
                alert('Photos uploaded successfully');
            }
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Failed to upload photos');
        }
    };

    const handleDeletePlace = async (details: string) => {
        try {
            const response = await apiClient.post('/front/setPlaceToBeDeleted', {
                place_id: place?.place_id,
                details: details
            });

            if (response.status === 200) {
                if (user)
                    updatePlaces(user?.admin);
                handleBackClick();
            }
        } catch (error) {
            console.error('Error deleting place:', error);
            alert('Failed to delete place');
        }
    };


    const handleInstagramUpdate = async () => {
        setIsScraping(true);
        try {
            console.log(instagramLink);
            const response = await apiClient.post('/front/updateInstagram', {
                place_id: place.place_id,
                instagram_link: instagramLink
            });

            if (response.status === 200) {
                if (user)
                    await updatePlaces(user?.admin);
                await updateImages();
                alert('Images Instagram récupérées');
            }
        } catch (error) {
            console.error('Error updating Instagram:', error);
            alert('Failed to update Instagram');
        } finally {
            setIsScraping(false);
        }
    };



    const handleWikimediaUpdate = async () => {
        setIsScraping(true);
        try {
            const response = await apiClient.post('/front/updateWikimedia', {
                place_id: place?.place_id,
                query: wikiQuery
            });

            if (response.status === 200) {
                await updateImages();
                if (user)
                    updatePlaces(user?.admin);
                alert('Wikimedia updated and images scraped successfully');
            }
        } catch (error) {
            console.error('Error updating Wikimedia:', error);
            alert('Failed to update Wikimedia');
        } finally {
            setIsScraping(false);
        }
    };


    const updateImages = async () => {
        try {
            const response = await apiClient.get(`/front/${place?.place_id}/images`);
            console.log('Update images response:', response);

            if (response.status === 200) {
                const newImages = response.data.map((image: { id: number, image_name: string, url: string }) => {
                    return {
                        id: image.id,
                        image_name: image.image_name,
                        url: image.url
                    };
                });

                setImages(newImages);
            }
        } catch (error) {
            console.error('Error updating images:', error);
        }
    };



    const handleBackClick = () => {
        console.log('Navigating back');
        navigate('/places-needing-attention');
    };

    return (
        <Container className="mt-5">
            <Row>
                <Col md={2} className="d-flex flex-column align-items-start">
                    <Button className="mb-3 w-100" variant="primary" onClick={() => {
                        navigate('/places-needing-attention');
                    }} disabled={isScraping}>
                        🔙 Retour
                    </Button>
                    <Button className="mb-3 w-100" variant="danger" onClick={() => setIsDeleting(!isDeleting)} disabled={isScraping}>
                        {isDeleting ? '❌ Annuler' : '🗑️ Supprimer photos'}
                    </Button>
                    <Button
                        className="mb-3 w-100"
                        variant="primary"
                        onClick={() => setIsSettingTop(!isSettingTop)}
                        disabled={isScraping || imagesToDeleteCount() > 0}
                    >
                        {isSettingTop ? '❌ Annuler' : '⭐ Définir top 3 et valider'}
                    </Button>


                    {isDeleting && (
                        <>
                            <Button className="mb-3 w-100" variant="secondary" onClick={() => setSelectedImages([...images])} disabled={isScraping || images.length === 0}>
                                🔍 Sélectionner toutes les photos
                            </Button>
                            <Button className="mb-3 w-100" variant="danger" onClick={handleDeleteImages} disabled={selectedImages.length === 0 || isScraping} >
                                🗑️ Confirmer suppression
                            </Button>
                        </>
                    )}
                    {imagesToDeleteCount() > 0 && (
                        <p className="text-danger mb-3">
                            Il reste {imagesToDeleteCount()} photo(s) à supprimer avant de continuer.
                        </p>
                    )}

                    {isSettingTop && (
                        <Button className="mb-3 w-100" variant="primary" onClick={handleSetTopImages} disabled={topImages.length !== 3 || isScraping}>
                            ⭐ Confirmer top 3
                        </Button>
                    )}
                </Col>
                <Col md={8}>
                    <h4 className="mb-4">{place?.place_name} - {cityName} - {place?.type === 'Business' ? '🍺🍽️ Bar/Restaurant' : '🏛️ Attraction touristique'} </h4>
                    <h5 className="mb-4">{place?.place_name_original ? "Nom orginal : " + place?.place_name_original : ""}</h5>


                    {place.details && (
                        <h2 className="mb-4 text-center">
                            🚨 {place.details.includes("Photos du propriétaire") ? "Pas de photos du propriétaire trouvées sur Maps" : place.details}
                        </h2>
                    )}
                    <div className="mb-4 text-center">
                        {place.wikipedia_link && (
                            <a className="btn btn-secondary mx-2 mb-2" href={place.wikipedia_link} target="_blank" rel="noopener noreferrer">
                                🌐 Wikipedia
                            </a>
                        )}
                        {place.google_maps_link && (
                            <a className="btn btn-secondary mx-2 mb-2" href={place.google_maps_link} target="_blank" rel="noopener noreferrer">
                                🗺️ Google Maps
                            </a>
                        )}
                        {place.instagram_link && (
                            <a className="btn btn-secondary mx-2 mb-2" href={place.instagram_link} target="_blank" rel="noopener noreferrer">
                                📸 Instagram
                            </a>
                        )}
                        {place.unsplash_link && (
                            <a className="btn btn-secondary mx-2 mb-2" href={place.unsplash_link} target="_blank" rel="noopener noreferrer">
                                📷 Unsplash
                            </a>
                        )}
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Button className="mb-3" variant="danger" onClick={() => setShowDeleteModal(true)} disabled={isScraping}>
                                    🗑️ Supprimer le lieu
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    <Row>
                        {images.map((image, index) => (
                            <Col md={4} key={index} className="mb-4">
                                <div
                                    className={`image-container ${selectedImages.includes(image) ? 'selected-delete' : ''} ${topImages.includes(image) ? 'selected-top' : ''}`}
                                    onClick={() => handleImageClick(image)}
                                >
                                    <img src={image.url} className="img-fluid rounded" />
                                    {selectedImages.includes(image) && <div className="selected-overlay">✓</div>}
                                    {topImages.includes(image) && <div className="selected-overlay">{topImages.indexOf(image) + 1}</div>}
                                </div>
                            </Col>
                        ))}
                    </Row>

                </Col>
                <Col md={2} className="d-flex flex-column align-items-start">
                    <Button className="mb-3 w-100" variant="success" onClick={() => setShowUploadModal(true)} disabled={isScraping}>
                        📤 Uploader des photos
                    </Button>
                    <Button className="mb-3 w-100" variant="success" disabled={isScraping} onClick={() => {
                        if (cityName) {
                            const url = generateGoogleSearchUrl(place.place_name, cityName);
                            window.open(url, '_blank');
                        }
                        else {
                            const url = generateGoogleSearchUrl(place.place_name, '');
                            window.open(url, '_blank');
                        }
                    }}>
                        📷 Rechercher Instagram
                    </Button>
                    <Button className="mb-3 w-100" variant="info" disabled={isScraping} onClick={() => setShowInstagramInput(!showInstagramInput)}>
                        {showInstagramInput ? '❌ Annuler' : '📸 Mettre l\'Instagram à jour'}
                    </Button>
                    <Button
                        className="mb-3 w-100"
                        variant="info"
                        onClick={handleGoogleRescrape}
                        disabled={isScraping}
                    >
                        {isScraping ? (
                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        ) : (
                            '🌍 Rescraper images Google'
                        )}
                    </Button>

                    {showInstagramInput && (
                        <Form.Group controlId="instagramLink">
                            <Form.Label>Instagram Link</Form.Label>
                            <Form.Control
                                type="text"
                                value={instagramLink}
                                onChange={(e) => setInstagramLink(e.target.value)}
                                placeholder="Enter new Instagram link"
                            />
                            <Button className="mt-3 w-100" variant="primary" onClick={handleInstagramUpdate} disabled={isScraping}>
                                {isScraping ? (
                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                ) : (
                                    'Mettre à jour Instagram'
                                )}
                            </Button>
                        </Form.Group>
                    )}
                    {place.type == "Tourist Attraction" && (
                        <Button className="mb-3 w-100" variant="info" disabled={isScraping} onClick={() => setShowWikimediaInput(!showWikimediaInput)}>
                            {showWikimediaInput ? '❌ Annuler' : '🌐 Scraper Wikimedia'}
                        </Button>
                    )}


                    {showWikimediaInput && (
                        <Form.Group controlId="wikimediaLink">
                            <Form.Label>Recherche Wikimedia</Form.Label>
                            <Form.Control
                                type="text"
                                value={wikiQuery}
                                onChange={(e) => setWikiQuery(e.target.value)}
                                placeholder="Entrer la recherche wikimedia"
                            />
                            <Button className="mt-3 w-100" variant="primary" onClick={handleWikimediaUpdate} disabled={isScraping}>
                                {isScraping ? (
                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                ) : (
                                    'Mettre à jour Wikimedia'
                                )}
                            </Button>
                        </Form.Group>
                    )}
                </Col>
            </Row>
            <UploadPhotosModal
                show={showUploadModal}
                onHide={() => setShowUploadModal(false)}
                onSubmit={handleUploadSubmit}
            />
            <DeletePlaceModal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                onConfirm={handleDeletePlace}
            />
        </Container>
    );
};

export default CheckPlaceNeedsAttention;
