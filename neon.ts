import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  preview: {
    buckets: {
      annales229: { access: "public_read" },
    },
  },
});
