import { DockgeServer } from "../dockge-server";
import { Router } from "../router";
import express, { Express, Router as ExpressRouter } from "express";

export class MainRouter extends Router {
    create(app: Express, server: DockgeServer): ExpressRouter {
        const router = express.Router();

        // Security headers middleware
        router.use((_req, res, next) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "SAMEORIGIN");
            res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            res.removeHeader("X-Powered-By");
            next();
        });

        router.get("/", (req, res) => {
            res.send(server.indexHTML);
        });

        // Robots.txt
        router.get("/robots.txt", async (_request, response) => {
            let txt = "User-agent: *\nDisallow: /";
            response.setHeader("Content-Type", "text/plain");
            response.send(txt);
        });

        return router;
    }

}
