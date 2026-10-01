import { mkdir, cp } from "node:fs/promises";
await mkdir("dist/server", { recursive: true });
await cp("worker", "dist/server", { recursive: true });
