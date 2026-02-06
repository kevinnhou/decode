export const site = {
  author: {
    links: "https://github.com/kevinnhou",
    name: "Kevin Hou",
    tag: "@kevinnhou",
  },
  category: "SportsApplication",
  datePublished: "2025-11-11",
  description:
    "Scouting Application for the 2025/2026 First Robotics Challenge - Decode",
  keywords: [],
  links: {
    repo: "https://github.com/kevinnhou/decode",
    url:
      process.env.NODE_ENV === "development"
        ? "http://localhost:3001"
        : `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "https://optimise.fyi"}`,
  },
  name: "decode",
  operatingSystem: "iOS, Android, Windows, macOS, Linux",
  rating: {
    ratingValue: 4.7,
    ratingCount: 42,
    bestRating: 5,
    worstRating: 3,
  },
  type: "SoftwareApplication",
};
