/** @type {import('tailwindcss').Config} */
export default {
  // If a class is used in a file not listed here, Tailwind will not generate
  // it and the style silently does nothing. This is the single most common
  // "my Tailwind class did nothing" cause.
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Signature grass-green, the one committed accent for the whole app
        // (design reference: Aida). Deep enough at 600/700 to carry white text
        // at AA. Neutrals stay slate; green is the only chromatic voice.
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
        // Warm off-white page canvas, faintly tinted toward the brand hue so
        // the white cards sitting on it read as raised, not flush.
        canvas: '#f5f8f4',
        // Deep pine/teal green: the clinical console's primary voice (design
        // reference: the MITA mockup). Cooler and more serious than `brand`
        // grass green, which stays on the marketing home screen.
        pine: {
          50: '#eaf3f0',
          100: '#d3e7e0',
          200: '#a6cfc2',
          300: '#6faf9d',
          400: '#3d8d78',
          500: '#1c7460',
          600: '#136b5b',
          700: '#0e5648',
          800: '#0b4539',
          900: '#08352c',
        },
        // Coral/clay: the one warm accent, used sparingly for the live pulse,
        // the record button, and the detected-domain highlight.
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
        // Neutral canvas for the console (cooler light grey than the home).
        console: '#f1f3f1',
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
        // The ECG trace drawing itself, left to right, on a loop.
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
        // Bengali is loaded explicitly rather than left to the system font
        // (prd.md edge case E-23), and paired with a Latin face at a similar
        // x-height so a bilingual line does not look like two documents
        // stapled together (design.md, Typography).
        sans: ['Inter', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'Inter', 'system-ui', 'sans-serif'],
        // Editorial serif for the console's "Hello, I'm Mita" display heading.
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // prd.md section 6: Bengali body text at 18px minimum, with more line
        // height than the Latin equivalent. The script is less legible small
        // and the মাত্রা headline needs vertical room.
        bn: ['1.125rem', { lineHeight: '1.9' }],
        'bn-lg': ['1.375rem', { lineHeight: '1.85' }],
      },
    },
  },
  plugins: [],
}
