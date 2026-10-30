import { createServer } from "node:http";
createServer((req, res) => {
  if (req.method === "GET" && req.url === "/auth/v1/settings") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        disable_signup: false,
        external: { email: true },
        mailer_autoconfirm: false,
      }),
    );
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3102, "127.0.0.1");
