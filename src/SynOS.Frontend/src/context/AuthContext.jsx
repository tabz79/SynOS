import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('synos_jwt'));
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeOversightBranchId, setActiveOversightBranchId] = useState(localStorage.getItem('synos_oversight_branch_id'));

    const setOversightBranch = (branchId) => {
        localStorage.setItem('synos_oversight_branch_id', branchId);
        setActiveOversightBranchId(branchId);
    };

    useEffect(() => {
        let timer;
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000;
                
                if (decoded.exp < currentTime) {
                    console.warn("Session expired. Logging out.");
                    logout();
                } else {
                    setUser({
                        id: decoded.nameid || decoded.id,
                        role: decoded.role || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
                        branchId: decoded.branch_id || decoded.branchId,
                        branchName: decoded.branch_name || "Unknown Branch",
                        departmentCode: decoded.department_code || "General",
                        resourceId: decoded.resource_id || decoded.resourceId,
                        roleId: decoded.roleId || decoded.RoleId,
                        name: decoded.unique_name || decoded.sub,
                    });

                    // Set auto-logout timer
                    const timeUntilExpiry = (decoded.exp - currentTime) * 1000;
                    timer = setTimeout(() => {
                        console.warn("Session expired during active use. Logging out.");
                        logout();
                    }, timeUntilExpiry);
                }
            } catch (error) {
                console.error("Invalid Token:", error);
                logout();
            }
        } else {
            setUser(null);
        }
        
        setIsLoading(false);

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [token]);

    const login = async (email, password, branchId = null) => {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, branchId }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || "Login failed");
        }

        const data = await response.json();

        // If the server requires more info, return the data to the caller (LoginPage)
        if (data.requiresBranchSelection) {
            return data;
        }

        const tokenValue = data.accessToken || data.token;
        if (!tokenValue) {
            throw new Error("Server response missing token");
        }

        localStorage.setItem('synos_jwt', tokenValue);

        try {
            const decoded = jwtDecode(tokenValue);
            const userObj = {
                id: decoded.nameid || decoded.id,
                role: decoded.role || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
                branchId: decoded.branch_id || decoded.branchId,
                branchName: decoded.branch_name || "Unknown Branch",
                departmentCode: decoded.department_code || "General",
                resourceId: decoded.resource_id || decoded.resourceId,
                roleId: decoded.roleId || decoded.RoleId,
                name: decoded.unique_name || decoded.sub,
            };
            setUser(userObj);
            setToken(tokenValue);
            return data;
        } catch (error) {
            console.error("Token Decode Failed:", error);
            throw new Error("Invalid Token received from server");
        }
    };

    const logout = () => {
        localStorage.removeItem('synos_jwt');
        localStorage.removeItem('synos_oversight_branch_id');
        setToken(null);
        setUser(null);
        setActiveOversightBranchId(null);
    };

    return (
        <AuthContext.Provider value={{
            token,
            user,
            login,
            logout,
            isLoading,
            isAuthenticated: !!user,
            activeOversightBranchId,
            setOversightBranch
        }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
