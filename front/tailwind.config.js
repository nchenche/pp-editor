/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{html,js}",
    "./node_modules/tw-elements/js/**/*.js",
  ],
  plugins: [require("tw-elements/plugin.cjs")],
  darkMode: "class"
};