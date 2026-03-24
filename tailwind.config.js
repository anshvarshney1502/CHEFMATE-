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
        /* Gold Premium palette */
        gold: {
          DEFAULT: '#D4A843',
          dark: '#A07830',
          glow: 'rgba(212,168,67,0.15)',
        },
        amber: {
          DEFAULT: '#C9A86A',
          light: '#FFF4DC',
        },
        onyx: {
          950: '#0D0B05',
          900: '#141005',
          800: '#1E1A08',
          700: '#2A240D',
        },
        sand: {
          DEFAULT: '#C9A86A',
          light: '#FFF4DC',
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
