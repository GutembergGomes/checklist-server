/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5D5CDE',
        'primary-dark': '#4B46C7',
        'primary-light': '#8B8DF0',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  safelist: [
    { pattern: /(bg|text)-(red|yellow|green)-(100|200|800|900)/, variants: ['dark'] }
  ]
}

