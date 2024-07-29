import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import Cookies from 'js-cookie';

interface User {
    login: string;
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
            setUser({ login: storedUser });
        }
    }, []);

    const checkCookie = () => {
        const storedUser = Cookies.get('user');
        return !!storedUser;
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
