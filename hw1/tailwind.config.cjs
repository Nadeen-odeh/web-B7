module.exports = {
  content: [
    "./*.{html,js,ts}",
    "./src/**/*.{html,js,ts}",
    "./**/*.html"
  ],
  darkMode: 'class',
  theme: {
    extend:{},
    screens: {
      'sm': '640px',
      'md' : '768px',
      'lg' : '1024px',
      'xl' : '1280px',
      '2xl' : '1536px'
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio")
  ],
};
