/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a1b1f',
        secondary: '#2c2f36',
        tertiary: '#3d3f47',
        accent: '#ff007a',
        'accent-hover': '#ff3394',
        success: '#27ae60',
        error: '#ff6871',
        warning: '#ff8f00',
        border: '#40444f',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
