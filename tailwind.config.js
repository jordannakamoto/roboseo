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
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide": {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' }, // moves off screen to the right
        },
        "grow": {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide": 'slide 1.2s ease-in-out infinite',
        "grow": 'grow 3s ease-out forwards',

      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}