const major = Number.parseInt(process.version.slice(1).split(".")[0] ?? "0", 10);
if (Number.isNaN(major) || major < 20) {
  console.error(
    `Node.js 20+ is required (Fastify 5). Current: ${process.version}\n` +
      "Fix: run `nvm use 20` (or install Node 20+) in this terminal, then retry.",
  );
  process.exit(1);
}
