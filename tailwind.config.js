/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#f9d7ac',
          300: '#f5ba77',
          400: '#f09340',
          500: '#ec7619',
          600: '#dd5c0f',
          700: '#b7440f',
          800: '#923714',
          900: '#763014',
        },
        sage: {
          50: '#f6f7f4',
          100: '#e9ece3',
          200: '#d4dac9',
          300: '#b6c1a5',
          400: '#97a67f',
          500: '#7a8b61',
          600: '#5f6e4b',
          700: '#4b573d',
          800: '#3e4734',
          900: '#363d2e',
        },
      },
    },
  },
  plugins: [],
};
