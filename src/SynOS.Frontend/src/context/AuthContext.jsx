import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('synos_jwt'));
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Map backend claims to frontend user object
                // Adjust claim keys based on actual JWT structure from backend audit if needed
                setUser({
                    role: decoded.role || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
                    branchId: decoded.branch_id || decoded.branchId || "Main",
                    branchName: decoded.branch_name || "Unknown Branch", // Bind Truth
                    name: decoded.unique_name || decoded.sub,
                });
            } catch (error) {
                console.error("Invalid Token:", error);
                logout();
            }
        } else {
            setUser(null);
        }
        setIsLoading(false);
    }, [token]);

    const login = async (email, password) => {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || "Login failed");
        }

        const data = await response.json();
        console.log("DEBUG: Login Response Payload:", data); // Added Debug Log

        // Handle common variations
        const tokenValue = data.token || data.accessToken || data.jwt || (typeof data === 'string' ? data : null);

        if (!tokenValue || typeof tokenValue !== 'string') {
            console.error("CRITICAL: No string token found in response", data);
            throw new Error("Server response missing token");
        }

        localStorage.setItem('synos_jwt', tokenValue);

        // FIX: Decode and set User immediately to prevent Race Condition
        try {
            const decoded = jwtDecode(tokenValue);
            const userObj = {
                role: decoded.role || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
                branchId: decoded.branch_id || decoded.branchId || "Main",
                branchName: decoded.branch_name || "Unknown Branch",
                name: decoded.unique_name || decoded.sub,
            };
            setUser(userObj);
            setToken(tokenValue);
        } catch (error) {
            console.error("Token Decode Failed:", error);
            throw new Error("Invalid Token received from server");
        }
    };

    const logout = () => {
        localStorage.removeItem('synos_jwt');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isLoading, isAuthenticated: !!user }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
