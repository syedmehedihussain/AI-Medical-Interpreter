/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Grass green: the app's primary voice (home + console).
        brand: {
          50: '#eefaf0',
          100: '#d6f2dc',
          200: '#aee4bb',
          300: '#7ed092',
          400: '#4fb86c',
          500: '#2ea24f',
          600: '#1f8a3f',
          700: '#196f34',
          800: '#175a2c',
          900: '#144a26',
        },
        // Coral/clay: the console's one warm accent (live pulse, record, detected).
        clay: {
          50: '#fdf0ea',
          100: '#fbdccf',
          200: '#f6b39c',
          300: '#f08a6a',
          400: '#ea6f47',
          500: '#e2613c',
          600: '#c94e2c',
          700: '#a83e22',
        },
        // Warm off-white page background.
        canvas: '#f5f8f4',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-16px) scale(1.015)' },
        },
        ecg: {
          '0%': { strokeDashoffset: '1200' },
          '100%': { strokeDashoffset: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(1.35)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 9s ease-in-out infinite',
        ecg: 'ecg 3.5s linear infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
      },
      fontFamily: {
        // Inter paired with Noto Sans Bengali at a similar x-height (E-23).
        sans: ['Inter', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Bengali body at 18px minimum with extra line height (prd.md section 6).
        bn: ['1.125rem', { lineHeight: '1.9' }],
        'bn-lg': ['1.375rem', { lineHeight: '1.85' }],
      },
    },
  },
  plugins: [],
}
