/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'Inter', 'sans-serif'],
      },
      colors: {
        apple: { red: '#FF3B30', blue: '#007AFF', purple: '#AF52DE', green: '#34C759', orange: '#FF9500' },
        charcoal: { DEFAULT: '#1C1C1E', 2: '#2C2C2E', 3: '#3A3A3C' },
      },
    },
  },
  plugins: [],
};
