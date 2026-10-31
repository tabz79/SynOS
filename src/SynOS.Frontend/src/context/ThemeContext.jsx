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

    // Display scale / interface density: 'small' | 'medium' | 'large' (default: 'medium')
    const [displaySize, setDisplaySizeState] = useState(() => {
        return localStorage.getItem('synos_display_size') || 'medium';
    });

    // Font size / typography legibility: 'small' | 'medium' | 'large' (default: 'medium')
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

        // Apply display size attribute and classes
        root.setAttribute('data-display-size', displaySize);
        root.classList.remove('display-size-small', 'display-size-medium', 'display-size-large');
        root.classList.add(`display-size-${displaySize}`);

        // Persist
        localStorage.setItem('synos_display_size', displaySize);
    }, [displaySize]);

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

    const handleSetDisplaySize = (newSize) => {
        if (['small', 'medium', 'large'].includes(newSize)) {
            setDisplaySizeState(newSize);
        }
    };

    const handleSetFontSize = (newSize) => {
        if (['small', 'medium', 'large'].includes(newSize)) {
            setFontSizeState(newSize);
        }
    };

    const value = {
        theme,
        setTheme: handleSetTheme,
        displaySize,
        setDisplaySize: handleSetDisplaySize,
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
