import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Default to 'dark' if no preference found (Canon Requirement)
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('synos_theme') || 'dark';
    });

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove previous classes
        root.classList.remove('light', 'dark');

        // Apply current theme
        root.classList.add(theme);

        // Persist
        localStorage.setItem('synos_theme', theme);
    }, [theme]);

    const value = {
        theme,
        setTheme: (newTheme) => setTheme(newTheme),
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
