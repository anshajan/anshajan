export type GenerateResponse = {
  keywords: string[];
  references: { id: string; imageUrl: string; title: string; engagement: number }[];
  style: {
    palette: string[];
    typography: string;
    layout: string;
    lighting: string;
    notes: string;
  };
  posterUrl: string;
  aspectRatio: "1:1" | "4:5" | "9:16";
  provider: "gemini" | "openai" | "demo";
  credits: { tier: "free" | "creator" | "agency"; remaining: number };
};
