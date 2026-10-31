/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{js,jsx}',
        './components/**/*.{js,jsx}',
        './app/**/*.{js,jsx}',
        './src/**/*.{js,jsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            gridTemplateColumns: {
                'synos-default': '3fr 1fr',
                'synos-focus': '60% 40%',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
                mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                synos: {
                    // Foundation - Zinc/Neutral based (No Blue Tint)
                    background: "var(--synos-background)", // Dynamic Theme
                    surface: "var(--synos-surface)",       // Dynamic Theme
                    border: "var(--synos-border)",         // Dynamic Theme
                    muted: "var(--synos-muted)",           // Dynamic Theme

                    // Card specific (Reference uses White cards on Dark BG)
                    card: "var(--synos-card)",
                    cardText: "var(--synos-card-text)",

                    // Functional
                    primary: "#2563eb",    // Blue 600 - Primary actions (Buttons only)

                    // States (Traffic Lights - Pastel/Modern)
                    amber: "#f59e0b",      // Amber 500
                    amberBg: "#fef3c7",    // Amber 100
                    emerald: "#10b981",    // Emerald 500
                    emeraldBg: "#d1fae5",  // Emerald 100
                    red: "#ef4444",        // Red 500
                    redBg: "#fee2e2",      // Red 100
                }
            },
            borderRadius: {
                'xl': '0.75rem',
                '2xl': '1rem',
            },
            transitionDuration: {
                '260': '260ms', // SynOS Motion Canon (Rigid Body Snap)
            },
            transitionTimingFunction: {
                'synos': 'cubic-bezier(0.22, 1, 0.36, 1)', // SynOS Motion Canon (Inverse-In, Rapid-Out)
            }
        },
    },
    plugins: [require("tailwindcss-animate")],
}
