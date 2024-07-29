import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';
import { IResponseStructure, IPlace } from '../model/Interfaces';
import PhotoSelectorCity from './PhotoSelectorCity';
import PhotoSelectorPlace from './PhotoSelectorPlace';
import { useUser } from '../context/UserContext';

const HomePage: React.FC = () => {
    const { data: places, updatePlaces } = usePlaces() as { data: IResponseStructure, updatePlaces: () => void };
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useUser();
    const [filteredPlaces, setFilteredPlaces] = useState<{ country: string; city: string; place: IPlace }[]>([]);
    const { countryName, cityName } = useParams<{ countryName: string; cityName: string; }>();
    const [selectedCityPlaces, setSelectedCityPlaces] = useState<IPlace[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<IPlace | null>(null);
    const [viewChecked, setViewChecked] = useState(false); // New state for toggling view
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    useEffect(() => {
        updatePlaces();
    }, [navigate]);

    useEffect(() => {
        if (searchQuery) {
            const newFilteredPlaces: { country: string; city: string; place: IPlace }[] = [];

            ['checked', 'unchecked'].forEach(status => {
                for (const country of Object.keys(places[status])) {
                    for (const city of Object.keys(places[status][country])) {
                        for (const place of Object.values(places[status][country][city]).flat()) {
                            if (place.place_name.toLowerCase().includes(searchQuery.toLowerCase())) {
                                newFilteredPlaces.push({ country, city, place });
                            }
                        }
                    }
                }
            });

            setFilteredPlaces(newFilteredPlaces);
        } else {
            setFilteredPlaces([]);
        }
    }, [searchQuery, places]);

    useEffect(() => {
        if (countryName && cityName) {
            const cityPlaces = viewChecked
                ? places.checked[countryName]?.[cityName] || {}
                : places.unchecked[countryName]?.[cityName] || {};
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

    const getTotalCounts = () => {
        let totalCountries = 0;
        let totalCities = 0;
        let totalPlacesUnchecked = 0;
        let totalPlacesChecked = 0;

        ['checked', 'unchecked'].forEach(status => {
            totalCountries += Object.keys(places[status]).length;
            for (const country of Object.keys(places[status])) {
                totalCities += Object.keys(places[status][country]).length;
                for (const city of Object.keys(places[status][country])) {
                    if (status === 'checked') {
                        totalPlacesChecked += Object.keys(places[status][country][city]).length;
                    } else {
                        totalPlacesUnchecked += Object.keys(places[status][country][city]).length;
                    }
                }
            }
        });

        return { totalCountries, totalCities, totalPlacesUnchecked, totalPlacesChecked };
    };

    const getCountsForCountry = (countryName: string) => {
        const countryChecked = places.checked[countryName] || {};
        const countryUnchecked = places.unchecked[countryName] || {};
        let cityCount = Object.keys(countryChecked).length + Object.keys(countryUnchecked).length;
        let placeCount = 0;

        for (const city of Object.keys(countryChecked)) {
            placeCount += Object.keys(countryChecked[city]).length;
        }
        for (const city of Object.keys(countryUnchecked)) {
            placeCount += Object.keys(countryUnchecked[city]).length;
        }

        return { cityCount, placeCount };
    };

    const getCountsForCity = (countryName: string, cityName: string) => {
        const cityChecked = places.checked[countryName]?.[cityName] || {};
        const cityUnchecked = places.unchecked[countryName]?.[cityName] || {};
        return Object.keys(cityChecked).length + Object.keys(cityUnchecked).length;
    };

    const { totalCountries, totalCities, totalPlacesUnchecked, totalPlacesChecked } = getTotalCounts();

    if (selectedPlace) {
        return <PhotoSelectorPlace place={selectedPlace} onComplete={handlePlaceComplete} />;
    }

    if (countryName && cityName && selectedCityPlaces.length > 0) {
        return <PhotoSelectorCity places={selectedCityPlaces} cityName={cityName} />;
    }

    return (
        <div className="container mt-5">
            <h1 className="mb-4 text-center">Sélection de photos</h1>
            <div className="d-flex justify-content-center mb-4">
                <button
                    className="btn btn-primary"
                    onClick={() => setViewChecked(!viewChecked)}
                >
                    {viewChecked ? 'Afficher To do' : 'Afficher Done'}
                </button>
            </div>
            <div className="d-flex justify-content-center">
                <ul className="list-group mb-4 w-50">
                    <li className="list-group-item">
                        <strong>🌍 Pays:</strong> {totalCountries}
                    </li>
                    <li className="list-group-item">
                        <strong>🏙️ Villes:</strong> {totalCities}
                    </li>
                    <li className="list-group-item">
                        <strong>🍻 Lieux à valider :</strong> {totalPlacesUnchecked}
                    </li>
                    <li className="list-group-item">
                        <strong>🍻 Lieux validés :</strong> {totalPlacesChecked}
                    </li>
                </ul>
            </div>

            <div className="d-flex justify-content-center mb-4">
                <input
                    type="text"
                    className="form-control w-50"
                    placeholder="Chercher un lieu"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            {searchQuery && (
                <div className="d-flex justify-content-center">
                    <ul className="list-group w-50">
                        {filteredPlaces.map(({ country, city, place }) => (
                            <li key={`${country}-${city}-${place.place_id}`} className="list-group-item">
                                <div
                                    onClick={() => handlePlaceClick(place)}
                                    className="text-decoration-none text-dark"
                                    style={{ cursor: 'pointer' }}
                                >
                                    {place.place_name} - {place.place_id} - {country} - {city}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="row">
                {Object.keys(places[viewChecked ? 'checked' : 'unchecked']).map(countryName => {
                    const { cityCount, placeCount } = getCountsForCountry(countryName);
                    return (
                        <div key={countryName} className="col-md-4 mb-4">
                            <div className="card shadow-sm">
                                <div className="card-header bg-dark text-white">
                                    <h5 className="card-title m-0">
                                        🌍 {countryName} ({cityCount} 🏙️, {placeCount} 🍻)
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {Object.keys(places[viewChecked ? 'checked' : 'unchecked'][countryName]).map(cityName => (
                                        <div key={cityName} className="mb-2">
                                            <h6 className="text-secondary">
                                                {viewChecked ? (
                                                    <span>{cityName} ({getCountsForCity(countryName, cityName)} 🍻)</span>
                                                ) : (
                                                    <Link to={`/city/${countryName}/${cityName}`} className="text-decoration-none text-dark">
                                                        {cityName} ({getCountsForCity(countryName, cityName)} 🍻)
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
