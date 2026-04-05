import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthContextType {
    isAuthenticated: boolean;
    role: string | null;
    loading: boolean;
    login: (tokens: { access: string; refresh: string }, role: string, user_id: number) => void;
    logout: () => void;
}

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const LEGACY_ACCESS_TOKEN_KEY = "access";
const LEGACY_REFRESH_TOKEN_KEY = "refresh";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // checks localStorage on page load to persist login
        const token = localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
        const storedRole = localStorage.getItem("role");

        if (token && storedRole) {
            setIsAuthenticated(true);
            setRole(storedRole);
        }
        setLoading(false);
    }, []);

    const login = (tokens: { access: string; refresh: string }, role: string, user_id: number) => {
        // saving everything so axios interceptor can use the token
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
        localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, tokens.access);
        localStorage.setItem(LEGACY_REFRESH_TOKEN_KEY, tokens.refresh);
        localStorage.setItem("role", role);
        localStorage.setItem("user_id", String(user_id));

        setIsAuthenticated(true);
        setRole(role);
    };

    const logout = () => {
        localStorage.clear();

        // resets so modal shows again on next login (they need to verify profile)
        sessionStorage.removeItem("verification_modal_shown");

        window.location.href = "/login";

        setIsAuthenticated(false);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, role, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};
