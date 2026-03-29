/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    bg: '#030303',       // Raindrop Sunset Mono - Base
                    surface: '#080808',  // Container
                    border: 'rgba(255, 255, 255, 0.06)',   // Raycast border
                },
                light: {
                    text: '#ffffff',     // Main text
                    glow: '#7042f8',     // Purple accent
                    muted: 'rgba(255, 255, 255, 0.45)', // Dim text
                }
            },
            boxShadow: {
                'neu-inset': 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.05)',
                'neu-outset': '5px 5px 10px rgba(0,0,0,0.5), -5px -5px 10px rgba(255,255,255,0.05)',
                'glass': '0 8px 32px 0 rgba(0,0,0,0.37)'
            }
        },
    },
    plugins: [],
}
