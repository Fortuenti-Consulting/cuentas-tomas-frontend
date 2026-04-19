import colors from 'tailwindcss/colors'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic aliases mapped to existing palette (no brand change per user decision).
        primary: colors.indigo,
        success: colors.green,
        warning: colors.yellow,
        danger: colors.red,
        muted: colors.gray,
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover':
          '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        drawer: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
}
