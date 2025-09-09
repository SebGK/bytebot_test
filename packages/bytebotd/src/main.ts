import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as express from 'express';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Disable Express "X-Powered-By" header to avoid information disclosure
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Configure body parser with increased payload size limit (50MB)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Simple in-memory rate limiting and API key authentication
  const requests = new Map<string, { count: number; startTime: number }>();
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
  const max = Number(process.env.RATE_LIMIT_MAX ?? 100);
  const apiKey = process.env.API_KEY;
  app.use((req, res, next) => {
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
      return res.status(429).send('Too Many Requests');
    }
    if (apiKey && req.headers['x-api-key'] !== apiKey) {
      console.warn(`Unauthorized request from ${ip}`);
      return res.status(401).send('Unauthorized');
    }
    next();
  });

  // Enable CORS with configurable allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:9992'];
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  });

  // Enable global validation pipes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const wsProxy = createProxyMiddleware({
    target: 'http://localhost:6080',
    ws: true,
    changeOrigin: true,
    pathRewrite: { '^/websockify': '/' },
  });
  app.use('/websockify', express.raw({ type: '*/*' }), wsProxy);
  const server = await app.listen(9990);

  // Selective upgrade routing
  server.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/websockify')) {
      wsProxy.upgrade(req, socket, head);
    }
    // else let Socket.IO/Nest handle it by not hijacking the socket
  });
}
bootstrap();
