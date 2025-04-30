import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { IPlace } from '../model/Interfaces';
import PhotoSelectorCity from './PhotoSelectorCity';
import PhotoSelectorPlace from './PhotoSelectorPlace';
import { useUser } from '../context/UserContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Spinner } from 'react-bootstrap';

const HomePage: React.FC = () => {
    const { data: places, previewData, updatePlaces, getPreview, getUncheckedPlacesByCity, refreshAllData } = usePlaces();
    const [searchQuery, setSearchQuery] = useState('');
    const { checkCookie, setUser } = useUser();
    const [filteredPlaces, setFilteredPlaces] = useState<{ country: string; city: string; place: IPlace; status: string }[]>([]);
    const { countryName, cityName } = useParams<{ countryName: string; cityName: string; }>();
    const [selectedCityPlaces, setSelectedCityPlaces] = useState<IPlace[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<IPlace | null>(null);
    const [viewChecked, setViewChecked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const user = useUser().user;

    // Check authentication
    useEffect(() => {
        if (!checkCookie()) {
            navigate('/login');
        } else if (!previewData) {
            // If user is authenticated but preview data isn't loaded, load it
            if (user) {
                getPreview(user.admin || false);
            }
        }
    }, [checkCookie, navigate, previewData, user, getPreview]);

    // Reset selected place when returning to homepage
    useEffect(() => {
        if (location.pathname === '/' || location.pathname === "") {
            setSelectedPlace(null);
        }
    }, [location]);

    // Handle search
    useEffect(() => {
        if (searchQuery && searchQuery.length >= 3) {
            setIsLoading(true);
            // If user is searching, load the full data to enable search functionality
            updatePlaces(user?.admin || false)
                .then(() => {
                    setIsLoading(false);
                })
                .catch(() => {
                    setIsLoading(false);
                });
        }
    }, [searchQuery, updatePlaces, user?.admin]);

    // Filter search results
    useEffect(() => {
        if (searchQuery && searchQuery.length >= 3 && places) {
            const newFilteredPlaces: { country: string; city: string; place: IPlace; status: string }[] = [];

            ['unchecked', 'needs_attention', 'to_be_deleted'].forEach(status => {
                for (const country of Object.keys(places[status])) {
                    for (const city of Object.keys(places[status][country])) {
                        for (const place of Object.values(places[status][country][city] || {}).flat()) {
                            if (
                                (place.place_name && place.place_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                (place.place_id && place.place_id.toString().includes(searchQuery))
                            ) {
                                newFilteredPlaces.push({ country, city, place, status });
                            }
                        }
                    }
                }
            });

            if (user?.admin) {
                for (const country of Object.keys(places.checked)) {
                    for (const city of Object.keys(places.checked[country])) {
                        for (const place of Object.values(places.checked[country][city] || {}).flat()) {
                            if (
                                (place.place_name && place.place_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                (place.place_id && place.place_id.toString().includes(searchQuery))
                            ) {
                                newFilteredPlaces.push({ country, city, place, status: 'checked' });
                            }
                        }
                    }
                }
            }

            setFilteredPlaces(newFilteredPlaces);
        } else {
            setFilteredPlaces([]);
        }
    }, [searchQuery, places, user?.admin]);

    // Load city data when navigating to a city
    useEffect(() => {
        if (countryName && cityName) {
            setIsLoading(true);
            if (viewChecked) {
                // If viewing checked places, load full data since preview doesn't include details
                updatePlaces(true).then(() => {
                    setIsLoading(false);
                });
            } else {
                // If viewing unchecked places, use our optimized endpoint
                getUncheckedPlacesByCity(cityName)
                    .then(data => {
                        setSelectedCityPlaces(data.places);
                        setIsLoading(false);
                    })
                    .catch(() => {
                        setIsLoading(false);
                    });
            }
        }
    }, [countryName, cityName, viewChecked, updatePlaces, getUncheckedPlacesByCity]);

    // Update selected city places from full data if needed
    useEffect(() => {
        if (countryName && cityName && viewChecked && places) {
            const cityPlaces = places.checked[countryName]?.[cityName] || {};
            const flattenedPlaces = Object.values(cityPlaces).flat() as IPlace[];
            setSelectedCityPlaces(flattenedPlaces);
        }
    }, [countryName, cityName, places, viewChecked]);

    const handlePlaceClick = (place: IPlace) => {
        setSelectedPlace(place);
        setSearchQuery('');
        navigate(`/place/${place.place_id}`);
    };

    const handlePlaceComplete = () => {
        setSelectedPlace(null);
        navigate('/');
    };

    // Calculate totals directly from previewData
    const calculateTotals = () => {
        if (!previewData) {
            return {
                totalCountries: 0,
                totalCities: 0,
                totalPlacesUnchecked: 0,
                totalPlacesChecked: 0,
                totalPlacesNeedsAttention: 0,
                totalPlacesToBeDeleted: 0
            };
        }

        const uniqueCountries = new Set<string>();
        const uniqueCities = new Set<string>();
        let totalPlacesUnchecked = 0;
        let totalPlacesChecked = 0;
        let totalPlacesNeedsAttention = 0;
        let totalPlacesToBeDeleted = 0;

        // Process unchecked places
        for (const country of Object.keys(previewData.unchecked)) {
            uniqueCountries.add(country);
            for (const city of Object.keys(previewData.unchecked[country])) {
                uniqueCities.add(`${country}-${city}`);
                for (const placeName of Object.keys(previewData.unchecked[country][city])) {
                    totalPlacesUnchecked += previewData.unchecked[country][city][placeName].place_count;
                }
            }
        }

        // Process needs_attention places
        for (const country of Object.keys(previewData.needs_attention)) {
            uniqueCountries.add(country);
            for (const city of Object.keys(previewData.needs_attention[country])) {
                uniqueCities.add(`${country}-${city}`);
                for (const placeName of Object.keys(previewData.needs_attention[country][city])) {
                    totalPlacesNeedsAttention += previewData.needs_attention[country][city][placeName].place_count;
                }
            }
        }

        // Process to_be_deleted places
        for (const country of Object.keys(previewData.to_be_deleted)) {
            uniqueCountries.add(country);
            for (const city of Object.keys(previewData.to_be_deleted[country])) {
                uniqueCities.add(`${country}-${city}`);
                for (const placeName of Object.keys(previewData.to_be_deleted[country][city])) {
                    totalPlacesToBeDeleted += previewData.to_be_deleted[country][city][placeName].place_count;
                }
            }
        }

        // Only process checked places if admin
        if (user?.admin) {
            for (const country of Object.keys(previewData.checked)) {
                uniqueCountries.add(country);
                for (const city of Object.keys(previewData.checked[country])) {
                    uniqueCities.add(`${country}-${city}`);
                    for (const placeName of Object.keys(previewData.checked[country][city])) {
                        totalPlacesChecked += previewData.checked[country][city][placeName].place_count;
                    }
                }
            }
        }

        return {
            totalCountries: uniqueCountries.size,
            totalCities: uniqueCities.size,
            totalPlacesUnchecked,
            totalPlacesChecked,
            totalPlacesNeedsAttention,
            totalPlacesToBeDeleted
        };
    };

    // Get counts for a country directly from previewData
    const getCountsForCountry = (countryName: string, viewChecked: boolean) => {
        if (!previewData) return { cityCount: 0, placeCount: 0 };

        const countryData = viewChecked ? previewData.checked[countryName] : previewData.unchecked[countryName];
        const cityCount = Object.keys(countryData || {}).length;
        let placeCount = 0;

        for (const city of Object.keys(countryData || {})) {
            for (const placeName of Object.keys(countryData[city] || {})) {
                placeCount += countryData[city][placeName].place_count;
            }
        }

        return { cityCount, placeCount };
    };

    // Get counts for a city directly from previewData
    const getCountsForCity = (countryName: string, cityName: string, viewChecked: boolean) => {
        if (!previewData) return 0;

        const cityData = viewChecked ? previewData.checked[countryName]?.[cityName] : previewData.unchecked[countryName]?.[cityName];
        let placeCount = 0;

        for (const placeName of Object.keys(cityData || {})) {
            placeCount += cityData[placeName].place_count;
        }

        return placeCount;
    };

    // Handle refresh all data
    const handleRefreshAll = () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        refreshAllData(user?.admin || false)
            .then(() => {
                setIsRefreshing(false);
                // If we're on a city page, reload the city data
                if (countryName && cityName) {
                    getUncheckedPlacesByCity(cityName)
                        .then(data => {
                            setSelectedCityPlaces(data.places);
                        })
                        .catch(error => console.error('Error refreshing city data:', error));
                }
            })
            .catch(error => {
                console.error('Error refreshing all data:', error);
                setIsRefreshing(false);
            });
    };

    const { totalCountries, totalCities, totalPlacesUnchecked, totalPlacesChecked, totalPlacesNeedsAttention, totalPlacesToBeDeleted } = calculateTotals();

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </Spinner>
            </div>
        );
    }

    if (selectedPlace) {
        return <PhotoSelectorPlace place={selectedPlace} onComplete={handlePlaceComplete} />;
    }

    if (countryName && cityName && selectedCityPlaces.length > 0) {
        return <PhotoSelectorCity places={selectedCityPlaces} cityName={cityName} />;
    }

    if (!previewData) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </Spinner>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between mb-4">
                <button
                    className="btn btn-danger"
                    onClick={() => {
                        setUser(null);
                        document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    }}
                >
                    Déconnexion
                </button>

                <button
                    className="btn btn-success"
                    onClick={handleRefreshAll}
                    disabled={isRefreshing}
                >
                    {isRefreshing ? (
                        <>
                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                            <span className="ms-2">Rafraîchissement...</span>
                        </>
                    ) : (
                        "🔄 Rafraîchir toutes les données"
                    )}
                </button>
            </div>

            <h1 className="mb-4 text-center">{viewChecked ? 'Lieux traités ✅' : 'Lieux à traiter ❌'}</h1>
            {user?.admin && (
                <div className="d-flex justify-content-center mb-4">
                    <button className="btn btn-primary" onClick={() => setViewChecked(!viewChecked)}>
                        {viewChecked ? 'Afficher lieux à traiter ❌' : 'Afficher lieux traités ✅'}
                    </button>
                </div>
            )}

            <div className="d-flex justify-content-center mb-4">
                <button className="btn btn-warning" onClick={() => navigate('/places-needing-attention')}>
                    🚨 Lieux nécessitant une attention
                </button>
            </div>

            {/* Admin button (only visible to admins) */}
            {user?.admin && (
                <div className="d-flex justify-content-center mb-4">
                    <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
                        Espace administrateur
                    </button>
                </div>
            )}

            <div className="d-flex justify-content-center">
                <ul className="list-group mb-4 w-50">
                    <li className="list-group-item">
                        <strong>🌍 Pays:</strong> {totalCountries}
                    </li>
                    <li className="list-group-item">
                        <strong>🏙️ Villes:</strong> {totalCities}
                    </li>
                    <li className="list-group-item">
                        <strong>🍻 Lieux à traiter :</strong> {totalPlacesUnchecked}
                    </li>
                    {user?.admin && (
                        <li className="list-group-item">
                            <strong>🍻 Lieux traités :</strong> {totalPlacesChecked}
                        </li>
                    )}
                    <li className="list-group-item">
                        <strong>🚨 Lieux nécessitant une attention :</strong> {totalPlacesNeedsAttention}
                    </li>
                    <li className="list-group-item">
                        <strong>🗑️ Lieux à supprimer :</strong> {totalPlacesToBeDeleted}
                    </li>
                </ul>
            </div>

            <div className="d-flex justify-content-center mb-4">
                <input
                    type="text"
                    className="form-control w-50"
                    placeholder="Chercher un lieu par nom ou ID (min. 3 caractères)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            {searchQuery && searchQuery.length >= 3 && (
                <div className="d-flex justify-content-center">
                    <ul className="list-group w-50">
                        {filteredPlaces.map(({ country, city, place, status }) => (
                            <li key={`${country}-${city}-${place.place_id}`} className="list-group-item">
                                <div
                                    onClick={() => handlePlaceClick(place)}
                                    className="text-decoration-none text-dark"
                                    style={{ cursor: 'pointer' }}
                                >
                                    {place.place_name} - {place.place_id} - {country} - {city} <span className="place-status">({status === 'checked' ? 'Déjà vérifié' : status === 'unchecked' ? 'A vérifier' : 'Requiert une attention'})</span>
                                </div>
                            </li>
                        ))}
                        {filteredPlaces.length === 0 && searchQuery.length >= 3 && (
                            <li className="list-group-item text-center">
                                Aucun résultat trouvé
                            </li>
                        )}
                    </ul>
                </div>
            )}
            <div className="row">
                {Object.keys(previewData[viewChecked ? 'checked' : 'unchecked']).map(countryName => {
                    const { cityCount, placeCount } = getCountsForCountry(countryName, viewChecked);
                    return (
                        <div key={countryName} className="col-md-4 mb-4">
                            <div className="card shadow-sm">
                                <div className="card-header bg-dark text-white">
                                    <h5 className="card-title m-0">
                                        🌍 {countryName} ({cityCount} 🏙️, {placeCount} 🍻)
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {Object.keys(previewData[viewChecked ? 'checked' : 'unchecked'][countryName]).map(cityName => (
                                        <div key={cityName} className="mb-2">
                                            <h6 className="text-secondary">
                                                {viewChecked ? (
                                                    <span>{cityName} ({getCountsForCity(countryName, cityName, viewChecked)} 🍻)</span>
                                                ) : (
                                                    <Link to={`/city/${countryName}/${cityName}`} className="text-decoration-none text-dark">
                                                        {cityName} ({getCountsForCity(countryName, cityName, viewChecked)} 🍻)
                                                    </Link>
                                                )}
                                            </h6>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HomePage;
