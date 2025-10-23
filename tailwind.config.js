/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'rcp-',
  content: [
    './extensions/customer-portal-vlad-ext/**/*.{html,js,liquid}',
    './extensions/customer-portal-vlad-ext/blocks/**/*.liquid',
    './extensions/customer-portal-vlad-ext/snippets/**/*.liquid',
  ],
  theme: {
    extend: {
      colors: {
        'primary-base': '#3B6380',
        'primary-accent': '#EF282D',
        'primary-gray': '#EEEDE7',
        'base-gray': '#DADDE2',
      },
      fontFamily: {
        hanleyBlock: ["'Hanley Pro', sans-serif;"],
        hanleyProSans: ["'Hanley Pro Sans', sans-serif;"],
        hanleyMonolineSans: ["'Hanley MonolineSans', sans-serif;"],
        optimalMedium: ["'OptimaLTPro Medium', sans-serif;"],
        gtAmerica: ["'GT America Trial', sans-serif;"],
      },
      borderWidth: {
        1: '1px',
      },
      lineHeight: {
        '120': '120%',
      },
    },
  },
  plugins: [],
}
