import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "AGou's Docsv5",
      description: "Welcome to AGou's Documentation v5!",
      logo: {
        src: "./src/assets/logo.png",
      },
      favicon: "/images/favicon.png",
      social: {
        github: "https://github.com/AGou-ops",
      },
      sidebar: [
        {
          label: "🔗 Links",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "⭐️ Go to myBlog", link: "https://agou-ops.cn" },
          ],
        },
        {
          label: "guide",
          autogenerate: { directory: "guide" },
        },
        {
          label: "CloudNative",
          autogenerate: { directory: "CloudNative" },
        },
        {
          label: "LinuxBasics",
          autogenerate: { directory: "LinuxBasics" },
        },
        {
          label: "ProgramLang",
          autogenerate: { directory: "ProgramLang" },
        },
        {
          label: "Scripts",
          autogenerate: { directory: "Scripts" },
        },
        {
          label: "Interview",
          autogenerate: { directory: "Interview" },
        },
        {
          label: "WORK",
          autogenerate: { directory: "WORK" },
        },
      ],
    }),
  ],
});
