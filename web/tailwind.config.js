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
        // Mission Control Premium Palette
        background: '#060814',      // Deep midnight black
        bgGradientStart: '#0f132e', // Deep blueprint indigo
        bgGradientEnd: '#060814',   // Midnight black
        cardBg: '#0d1127',          // Translucent deep navy
        cardBorder: '#1e264d',      // Subtle high-tech outline
        cardBorderHover: '#2d3875', // Highlighted outline on hover
        
        textPrimary: '#ffffff',     // High contrast white
        textSecondary: '#8f9bb3',   // Muted slate
        textMuted: '#5e6881',       // Extra muted slate
        
        // Brand / Accent Gradients
        brandPrimary: '#8a2be2',    // Neon violet
        brandSecondary: '#4f46e5',  // Indigo
        accentCyan: '#22d3ee',      // Neon cyan
        accentMagenta: '#ec4899',   // Neon magenta
        accentTeal: '#14b8a6',      // Neon teal
        accentBlue: '#3b82f6',      // Royal blue
        
        // Status Colors (Matching mockups)
        success: '#10b981',         // Emerald green
        warning: '#f59e0b',         // Amber orange
        error: '#ef4444',           // Bright red
        pending: '#f97316',         // Orange
        
        inputBackground: '#0c0f20', // Input field background
        focusRing: '#8a2be2',       // Violet ring
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'neon-purple': '0 0 15px rgba(138, 43, 226, 0.4)',
        'neon-cyan': '0 0 15px rgba(34, 211, 238, 0.4)',
        'neon-teal': '0 0 15px rgba(20, 184, 166, 0.4)',
        'neon-magenta': '0 0 15px rgba(236, 72, 153, 0.4)',
        'card-glow': '0 4px 30px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
