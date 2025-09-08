export const site = {
  author: {
    links: "",
    name: "",
    tag: "",
  },
  category: "",
  datePublished: "",
  description: "",
  keywords: [],
  links: {
    repo: "",
    url:
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : `http://${process.env.VERCEL_PROJECT_PRODUCTION_URL || ""}`,
  },
  name: "decode",
  operatingSystem: "",
  rating: {
    bestRating: 0,
    ratingCount: 0,
    ratingValue: 0,
    worstRating: 0,
  },
  type: "",
};
