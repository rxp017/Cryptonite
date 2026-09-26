## known Windows issue

If `npm run dev` fails, run `node scripts/with-app-env.mjs node node_modules/vite/bin/vite.js dev --host 0.0.0.0 --port 8080` from the repo root; if port 8080 is occupied, stop that server or choose a free port.
