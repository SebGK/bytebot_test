import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createProxyServer } from "http-proxy";
import next from "next";
import { createServer } from "http";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "9992", 10);

// Backend URLs
const BYTEBOT_AGENT_BASE_URL = process.env.BYTEBOT_AGENT_BASE_URL;
const BYTEBOT_DESKTOP_VNC_URL = process.env.BYTEBOT_DESKTOP_VNC_URL;

const app = next({ dev, hostname, port });

app
  .prepare()
  .then(() => {
    const handle = app.getRequestHandler();
    const nextUpgradeHandler = app.getUpgradeHandler();

    const vncProxy = createProxyServer({ changeOrigin: true, ws: true });

    const expressApp = express();
    expressApp.disable("x-powered-by");

    // Simple in-memory rate limiting, CORS and API key authentication
    const requests = new Map<string, { count: number; startTime: number }>();
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
    const max = Number(process.env.RATE_LIMIT_MAX ?? 100);
    const apiKey = process.env.API_KEY;
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:9992"]; 
    expressApp.use((req, res, next) => {
      const ip = req.ip;
      const now = Date.now();
      const entry = requests.get(ip) ?? { count: 0, startTime: now };
      if (now - entry.startTime > windowMs) {
        entry.count = 0;
        entry.startTime = now;
      }
      entry.count += 1;
      requests.set(ip, entry);
      if (entry.count > max) {
        return res.status(429).send("Too Many Requests");
      }
      const origin = req.headers.origin as string | undefined;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS,PATCH",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, x-api-key",
      );
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
      if (apiKey && req.headers["x-api-key"] !== apiKey) {
        console.warn(`Unauthorized request from ${ip}`);
        return res.status(401).send("Unauthorized");
      }
      next();
    });

    const server = createServer(expressApp);

    // WebSocket proxy for Socket.IO connections to backend
    const tasksProxy = createProxyMiddleware({
      target: BYTEBOT_AGENT_BASE_URL,
      ws: true,
      pathRewrite: { "^/api/proxy/tasks": "/socket.io" },
    });

    // Apply HTTP proxies
    expressApp.use("/api/proxy/tasks", tasksProxy);
    expressApp.use("/api/proxy/websockify", (req, res) => {
      console.log("Proxying websockify request");
      // Rewrite path
      const targetUrl = new URL(BYTEBOT_DESKTOP_VNC_URL!);
      req.url =
        targetUrl.pathname +
        (req.url?.replace(/^\/api\/proxy\/websockify/, "") || "");
      vncProxy.web(req, res, {
        target: `${targetUrl.protocol}//${targetUrl.host}`,
      });
    });

    // Handle all other requests with Next.js
    expressApp.all("*", (req, res) => handle(req, res));

    // Properly upgrade WebSocket connections
    server.on("upgrade", (request, socket, head) => {
      const { pathname } = new URL(
        request.url!,
        `http://${request.headers.host}`,
      );

      if (pathname.startsWith("/api/proxy/tasks")) {
        return tasksProxy.upgrade(request, socket as any, head);
      }

      if (pathname.startsWith("/api/proxy/websockify")) {
        const targetUrl = new URL(BYTEBOT_DESKTOP_VNC_URL!);
        request.url =
          targetUrl.pathname +
          (request.url?.replace(/^\/api\/proxy\/websockify/, "") || "");
        console.log("Proxying websockify upgrade request: ", request.url);
        return vncProxy.ws(request, socket as any, head, {
          target: `${targetUrl.protocol}//${targetUrl.host}`,
        });
      }

      nextUpgradeHandler(request, socket, head);
    });

    server.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });
