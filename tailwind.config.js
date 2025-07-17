/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./apps/admin/src/**/*.{html,ts}",
    "./apps/web/src/**/*.{html,ts}",
    "./libs/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}