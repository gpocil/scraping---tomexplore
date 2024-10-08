import React, { useEffect, useState } from 'react';
import apiClient from '../util/apiClient';
import { Accordion, Badge, Card, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { usePlaces } from '../context/PlacesContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

interface VerifiedPlace {
    id_tomexplore: number;
    name_eng: string;
    timestamp_start: string;
    timestamp_end: string;
    has_needed_attention: boolean;
}

interface DailyStats {
    id: number;
    redactor_id: number;
    day: string;
    total_places: number;
    places_needing_att: number;
    total_time_spent: number;
    avg_time_per_place: number;
    verifiedPlaces: VerifiedPlace[];
}

interface UserInfo {
    id: number;
    login: string;
    total_places: number;
    total_time_spent: number;
    places_needing_att_checked: number;
    avg_time_per_place: number;
    dailyStats: DailyStats[];
    verifiedPlaces: VerifiedPlace[];
}

const Admin: React.FC = () => {
    const user = useUser().user;
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { findPlaceById } = usePlaces();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || !user.admin) {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await apiClient.get('/front/userStats');
                console.log(response.data);
                const usersData = response.data || [];

                const updatedUsers = usersData.map((user: UserInfo) => {
                    const updatedDailyStats = user.dailyStats.map((dayStat: DailyStats) => {
                        const filteredVerifiedPlaces = user.verifiedPlaces.filter((place: VerifiedPlace) => {
                            const placeDate = new Date(place.timestamp_start).toISOString().slice(0, 10);
                            return placeDate === dayStat.day;
                        });

                        const totalTimeSpent = filteredVerifiedPlaces.reduce((acc, place) => {
                            const duration = new Date(place.timestamp_end).getTime() - new Date(place.timestamp_start).getTime();
                            return acc + duration;
                        }, 0) / 1000; // Conversion en secondes

                        const totalPlaces = filteredVerifiedPlaces.length;
                        const avgTimePerPlace = totalPlaces > 0 ? totalTimeSpent / totalPlaces : 0;

                        return {
                            ...dayStat,
                            verifiedPlaces: filteredVerifiedPlaces,
                            total_places: totalPlaces,
                            total_time_spent: totalTimeSpent,
                            avg_time_per_place: avgTimePerPlace,
                        };
                    });

                    return {
                        ...user,
                        dailyStats: updatedDailyStats,
                    };
                });

                setUsers(updatedUsers);
                console.log(updatedUsers);
                setLoading(false);
            } catch (error) {
                setError('Failed to load user info');
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, []);

    const formatDuration = (seconds: number) => {
        if (isNaN(seconds)) {
            return '0 sec';
        }

        const absSeconds = Math.abs(seconds);
        const hours = Math.floor(absSeconds / 3600);
        const minutes = Math.floor((absSeconds % 3600) / 60);
        const remainingSeconds = Math.floor(absSeconds % 60);
        const sign = seconds < 0 ? '-' : '';

        if (hours > 0) {
            return `${sign}${hours} h ${minutes} m ${remainingSeconds} s`;
        } else if (minutes > 0) {
            return `${sign}${minutes} m ${remainingSeconds} s`;
        } else {
            return `${sign}${remainingSeconds} sec`;
        }
    };

    const handlePlaceClick = (verifiedPlace: VerifiedPlace) => {
        const foundPlace = findPlaceById(verifiedPlace.id_tomexplore);

        if (foundPlace) {
            const newWindow = window.open(`/admin/check-place/${verifiedPlace.id_tomexplore}`, '_blank');
            if (newWindow) {
                newWindow.focus();
            }
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" role="status">
                    <span className="sr-only">Loading...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <div className="container mt-5">
            <button
                className="btn btn-primary"
                onClick={() => {
                    navigate('/');
                }}
            >
                🏠 Accueil
            </button>
            <h2 className="text-center mb-4">Admin Dashboard</h2>

            <Accordion defaultActiveKey="0">
                {users.length > 0 ? (
                    users.map((user, userIndex) => (
                        <Accordion.Item eventKey={`${userIndex}`} key={user.id}>
                            <Accordion.Header>
                                <h2><b>{user.login}</b></h2>
                                <Badge bg="primary" pill>Total Places: {user.total_places}</Badge>{' '}
                                <Badge bg="info" pill>Places needing attention: {user.places_needing_att_checked}</Badge>{' '}
                                <Badge bg="success" pill>Time Spent: {formatDuration(user.total_time_spent)}</Badge>{' '}
                                <Badge bg="info" pill>Avg Time per Place: {formatDuration(user.avg_time_per_place)}</Badge>
                            </Accordion.Header>
                            <Accordion.Body>
                                <h4>Daily Stats</h4>
                                <Accordion defaultActiveKey="0">
                                    {user.dailyStats && user.dailyStats.length > 0 ? (
                                        user.dailyStats.map((day, dayIndex) => (
                                            <Accordion.Item eventKey={`day-${userIndex}-${dayIndex}`} key={day.id}>
                                                <Accordion.Header>
                                                    {day.day} - Total places: {day.total_places},
                                                    Places needing attention: {day.places_needing_att},
                                                    Time spent: {formatDuration(day.total_time_spent)},
                                                    Avg. time per place: {formatDuration(day.avg_time_per_place)}
                                                </Accordion.Header>
                                                <Accordion.Body>
                                                    <Card>
                                                        <Card.Header className="bg-secondary text-white">Verified Places</Card.Header>
                                                        <ListGroup variant="flush">
                                                            {day.verifiedPlaces && day.verifiedPlaces.length > 0 ? (
                                                                day.verifiedPlaces.map((place) => (
                                                                    <ListGroup.Item
                                                                        key={place.id_tomexplore}
                                                                        action
                                                                        onClick={() => handlePlaceClick(place)}
                                                                        className={place.has_needed_attention ? 'attention-needed' : ''}
                                                                        style={place.has_needed_attention ? { backgroundColor: '#ffcccc' } : {}}
                                                                    >
                                                                        <h5>
                                                                            {place.name_eng}{' '}
                                                                            {place.has_needed_attention && (
                                                                                <Badge bg="warning" className="ml-2">
                                                                                    ⚠️ A requis une attention
                                                                                </Badge>
                                                                            )}
                                                                            <Badge bg="secondary" className="ml-2">
                                                                                ID: {place.id_tomexplore}
                                                                            </Badge>
                                                                        </h5>
                                                                        <div>
                                                                            <Badge bg="info">Start: {new Date(place.timestamp_start).toLocaleString()}</Badge>{' '}
                                                                            <Badge bg="danger">End: {new Date(place.timestamp_end).toLocaleString()}</Badge>
                                                                            <span> --- {formatDuration((new Date(place.timestamp_end).getTime() - new Date(place.timestamp_start).getTime()) / 1000)}</span>
                                                                        </div>
                                                                    </ListGroup.Item>
                                                                ))
                                                            ) : (
                                                                <ListGroup.Item>No places found for this day</ListGroup.Item>
                                                            )}
                                                        </ListGroup>
                                                    </Card>
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        ))
                                    ) : (
                                        <p>No daily stats found for this user</p>
                                    )}
                                </Accordion>
                            </Accordion.Body>

                        </Accordion.Item>
                    ))
                ) : (
                    <p>No users found</p>
                )}
            </Accordion>
        </div>
    );
};

export default Admin;
