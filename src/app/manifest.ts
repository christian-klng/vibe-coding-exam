import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

// Lets people install the app: to the dock on desktop, to the home screen on Android and iOS.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Metadata");
  return {
    name: "Vibe Buddy",
    short_name: "Vibe Buddy",
    description: t("description"),
    start_url: "/",
    display: "standalone",
    background_color: "#faf6e9",
    theme_color: "#faf6e9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
