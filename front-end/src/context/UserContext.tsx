import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import Cookies from 'js-cookie';

interface User {
    login: string;
    userId: number;
    admin: boolean;
}

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    checkCookie: () => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const storedUser = Cookies.get('user');

        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.login && parsedUser.userId) {
                    setUser({ login: parsedUser.login, userId: parsedUser.userId, admin: parsedUser.admin });
                }
            } catch (error) {
                console.error('Error parsing user cookie', error);
            }
        }
    }, []);

    const checkCookie = () => {
        const storedUser = Cookies.get('user');

        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                return !!(parsedUser && parsedUser.login && parsedUser.userId);
            } catch (error) {
                console.error('Error parsing user cookie', error);
                return false;
            }
        }

        return false;
    };

    return (
        <UserContext.Provider value={{ user, setUser, checkCookie }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
