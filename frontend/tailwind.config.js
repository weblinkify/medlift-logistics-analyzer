/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: { 950: '#0b1220', 900: '#111a2e', 800: '#1a2540', 700: '#26324f', 500: '#64748b', 300: '#cbd5e1' },
        drone: { DEFAULT: '#2563eb', soft: '#dbeafe' },
        courier: { DEFAULT: '#d97706', soft: '#fef3c7' },
      },
    },
  },
  plugins: [],
};
