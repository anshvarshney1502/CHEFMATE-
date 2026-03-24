/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Verdant Noir palette */
        emerald: {
          DEFAULT: '#34D399',
          dark: '#059669',
          glow: 'rgba(52,211,153,0.15)',
        },
        amber: {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
        },
        forest: {
          950: '#060A07',
          900: '#0C1410',
          800: '#131D17',
          700: '#192A1F',
        },
        mint: {
          DEFAULT: '#6EE7B7',
          light: '#ECFDF5',
        },
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        lg: '16px',
        md: '10px',
        pill: '999px',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'glow': 'glow 2.5s ease-in-out infinite',
        'fadeUp': 'fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'ring': 'ring 2s ease-out infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
        'dot': 'dot 1.4s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'blink': 'blink 0.8s steps(1) infinite',
        'scaleIn': 'scaleIn 0.35s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};
