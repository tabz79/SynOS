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
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                synos: {
                    // Foundation - Zinc/Neutral based (No Blue Tint)
                    background: "#18181b", // Zinc 950 - Deep OS background
                    surface: "#27272a",    // Zinc 800 - Panel background
                    border: "#3f3f46",     // Zinc 700 - Subtle borders
                    muted: "#a1a1aa",      // Zinc 400 - Muted text

                    // Card specific (Reference uses White cards on Dark BG)
                    card: "#ffffff",
                    cardText: "#18181b",

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
            }
        },
    },
    plugins: [require("tailwindcss-animate")],
}
