export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15212e",
        muted: "#64748b",
        line: "#d9e2ea",
        soft: "#f5f7fa",
        teal: "#0f8f8a",
        amber: "#d78b21"
      },
      boxShadow: {
        panel: "0 8px 30px rgba(27, 39, 52, 0.08)",
        hero: "0 16px 48px rgba(27, 39, 52, 0.14)"
      },
      borderRadius: {
        panel: "8px"
      }
    }
  },
  plugins: []
};
