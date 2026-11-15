/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cookie: {
          cocoa: "#603928",
          caramel: "#A85F34",
          amber: "#D37D30",
          biscuit: "#F2B366",
          cream: "#F0F0F0",
          surface: "#FFFFFF",
          border: "#E0D8D2",
          inputBorder: "#C4B5AB",
          readonlyBg: "#F0F0F0",
          readonlyBorder: "#D6CCC5",
          errorText: "#B91C1C",
          errorBg: "#FEF2F2",
          warningText: "#9A3412",
          warningBg: "#FEF3C7",
          successText: "#065F46",
          successBg: "#EAF6EF",
        },
      },
    },
  },
  plugins: [],
};

