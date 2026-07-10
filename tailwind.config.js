/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        crema: '#DAD7CD',
        sage: '#A3B18A',
        verde: '#588157',
        'verde-oscuro': '#3A5A40',
        'verde-noche': '#344E41'
      },
      fontFamily: {
        display: ['var(--font-anton)', 'sans-serif'],
        body: ['var(--font-worksans)', 'sans-serif']
      }
    }
  },
  plugins: []
};
