/** @type {import('tailwindcss').Config} */
export default {
  // If a class is used in a file not listed here, Tailwind will not generate
  // it and the style silently does nothing. This is the single most common
  // "my Tailwind class did nothing" cause.
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Bengali is loaded explicitly rather than left to the system font
        // (prd.md edge case E-23), and paired with a Latin face at a similar
        // x-height so a bilingual line does not look like two documents
        // stapled together (design.md, Typography).
        sans: ['Inter', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'Inter', 'system-ui', 'sans-serif'],
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
