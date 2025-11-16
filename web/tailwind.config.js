// File: web/tailwind.config.js
// Author: Gemini
// Date: 2025-11-13

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"], // Enable dark mode by default
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode palette (as per design docs)
        background: '#1a1a1a', // near black
        card: '#2a2a2a', // card surfaces
        elevated: '#3a3a3a', // modal dialogs
        textPrimary: '#f0f0f0', // off-white
        textSecondary: '#a0a0a0', // muted
        border: '#444444', // subtle
        inputBackground: '#252525',

        // Status Colors (High Contrast)
        success: '#10b981', // emerald
        warning: '#f59e0b', // amber
        error: '#ef4444', // bright red
        flagHigh: '#ef4444', // red
        flagLow: '#3b82f6', // blue
        flagCritical: '#ff0000', // pure red, animated
        pending: '#f97316', // orange-red

        // Highlight Colors
        focusRing: '#60a5fa', // blue
        selection: 'rgba(251, 191, 36, 0.4)', // golden highlight with opacity
        activeTab: '#60a5fa', // blue underline
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'sans-serif'], // As per design docs
        mono: ['Courier New', 'monospace'], // For barcodes, IDs
      },
      spacing: {
        '2': '2px',
        '4': '4px',
        '6': '6px',
        '8': '8px', // Standard gap, default
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
      },
      // TODO: Add more theme extensions as per UX design system (e.g., typography sizes, line heights, button sizes)
    },
  },
  plugins: [],
}
