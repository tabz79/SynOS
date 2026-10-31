import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Default to 'light' mode unless explicitly chosen by user
    const [theme, setTheme] = useState(() => {
        const isExplicit = localStorage.getItem('synos_theme_explicit') === 'true';
        if (isExplicit) {
            return localStorage.getItem('synos_theme') || 'light';
        }
        return 'light';
    });

    // Font size customisation: 'small' | 'medium' | 'large' (default: 'medium')
    const [fontSize, setFontSizeState] = useState(() => {
        return localStorage.getItem('synos_font_size') || 'medium';
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

    useEffect(() => {
        const root = window.document.documentElement;

        // Apply font size attribute and classes
        root.setAttribute('data-font-size', fontSize);
        root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
        root.classList.add(`font-size-${fontSize}`);

        // Persist
        localStorage.setItem('synos_font_size', fontSize);
    }, [fontSize]);

    const handleSetTheme = (newTheme) => {
        localStorage.setItem('synos_theme_explicit', 'true');
        setTheme(newTheme);
    };

    const handleSetFontSize = (newSize) => {
        if (['small', 'medium', 'large'].includes(newSize)) {
            setFontSizeState(newSize);
        }
    };

    const value = {
        theme,
        setTheme: handleSetTheme,
        fontSize,
        setFontSize: handleSetFontSize
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
