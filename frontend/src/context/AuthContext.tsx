import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthContextType {
    isAuthenticated: boolean;
    role: string | null;
    loading: boolean;
    login: (tokens: { access: string; refresh: string }, role: string, user_id: number) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore auth state from localStorage on page refresh
        const token = localStorage.getItem("access");
        const storedRole = localStorage.getItem("role");

        if (token && storedRole) {
            setIsAuthenticated(true);
            setRole(storedRole);
        }
        setLoading(false);
    }, []);

    const login = (tokens: { access: string; refresh: string }, role: string, user_id: number) => {
        // Store tokens and user info for API calls
        localStorage.setItem("access", tokens.access);
        localStorage.setItem("refresh", tokens.refresh);
        localStorage.setItem("role", role);
        localStorage.setItem("user_id", String(user_id));

        setIsAuthenticated(true);
        setRole(role);
    };

    const logout = () => {
        // Clear all auth data
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("role");
        localStorage.removeItem("user_id");

        // Reset verification modal flag so it shows again on next login
        sessionStorage.removeItem("verification_modal_shown");

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
