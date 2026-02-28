import { log } from "./log";
import fs from "fs";
import path from "path";

export interface StackTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    composeYAML: string;
    composeENV: string;
    icon?: string;
    isBuiltIn: boolean;
}

const builtInTemplates: StackTemplate[] = [
    {
        id: "nginx",
        name: "Nginx",
        description: "High-performance HTTP server and reverse proxy",
        category: "Web Server",
        icon: "globe",
        isBuiltIn: true,
        composeYAML: `services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped`,
        composeENV: "",
    },
    {
        id: "postgres",
        name: "PostgreSQL",
        description: "Powerful, open source relational database",
        category: "Database",
        icon: "database",
        isBuiltIn: true,
        composeYAML: `services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:`,
        composeENV: "POSTGRES_USER=postgres\nPOSTGRES_PASSWORD=changeme\nPOSTGRES_DB=mydb",
    },
    {
        id: "mysql",
        name: "MySQL",
        description: "Popular open source relational database",
        category: "Database",
        icon: "database",
        isBuiltIn: true,
        composeYAML: `services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: \${MYSQL_DATABASE}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

volumes:
  mysql_data:`,
        composeENV: "MYSQL_ROOT_PASSWORD=changeme\nMYSQL_DATABASE=mydb",
    },
    {
        id: "redis",
        name: "Redis",
        description: "In-memory data store, cache, and message broker",
        category: "Database",
        icon: "database",
        isBuiltIn: true,
        composeYAML: `services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:`,
        composeENV: "",
    },
    {
        id: "mariadb",
        name: "MariaDB",
        description: "Community-developed fork of MySQL",
        category: "Database",
        icon: "database",
        isBuiltIn: true,
        composeYAML: `services:
  mariadb:
    image: mariadb:11
    environment:
      MARIADB_ROOT_PASSWORD: \${MARIADB_ROOT_PASSWORD}
      MARIADB_DATABASE: \${MARIADB_DATABASE}
    volumes:
      - mariadb_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

volumes:
  mariadb_data:`,
        composeENV: "MARIADB_ROOT_PASSWORD=changeme\nMARIADB_DATABASE=mydb",
    },
    {
        id: "mongodb",
        name: "MongoDB",
        description: "Document-oriented NoSQL database",
        category: "Database",
        icon: "database",
        isBuiltIn: true,
        composeYAML: `services:
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"
    restart: unless-stopped

volumes:
  mongo_data:`,
        composeENV: "MONGO_USER=admin\nMONGO_PASSWORD=changeme",
    },
    {
        id: "traefik",
        name: "Traefik",
        description: "Modern HTTP reverse proxy and load balancer",
        category: "Web Server",
        icon: "globe",
        isBuiltIn: true,
        composeYAML: `services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped`,
        composeENV: "",
    },
    {
        id: "wordpress",
        name: "WordPress",
        description: "WordPress with MySQL database",
        category: "CMS",
        icon: "blog",
        isBuiltIn: true,
        composeYAML: `services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: \${DB_USER}
      WORDPRESS_DB_PASSWORD: \${DB_PASSWORD}
      WORDPRESS_DB_NAME: \${DB_NAME}
    volumes:
      - wordpress_data:/var/www/html
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8
    environment:
      MYSQL_DATABASE: \${DB_NAME}
      MYSQL_USER: \${DB_USER}
      MYSQL_PASSWORD: \${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: \${DB_ROOT_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  wordpress_data:
  db_data:`,
        composeENV: "DB_USER=wordpress\nDB_PASSWORD=changeme\nDB_NAME=wordpress\nDB_ROOT_PASSWORD=changeme",
    },
    {
        id: "gitea",
        name: "Gitea",
        description: "Lightweight self-hosted Git service",
        category: "Dev Tools",
        icon: "code-branch",
        isBuiltIn: true,
        composeYAML: `services:
  gitea:
    image: gitea/gitea:latest
    environment:
      USER_UID: 1000
      USER_GID: 1000
    volumes:
      - gitea_data:/data
    ports:
      - "3000:3000"
      - "2222:22"
    restart: unless-stopped

volumes:
  gitea_data:`,
        composeENV: "",
    },
    {
        id: "portainer",
        name: "Portainer",
        description: "Container management platform",
        category: "Management",
        icon: "cubes",
        isBuiltIn: true,
        composeYAML: `services:
  portainer:
    image: portainer/portainer-ce:latest
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    restart: unless-stopped

volumes:
  portainer_data:`,
        composeENV: "",
    },
];

export class StackTemplates {
    private templatesDir: string;

    constructor(dataDir: string) {
        this.templatesDir = path.join(dataDir, "templates");
        if (!fs.existsSync(this.templatesDir)) {
            fs.mkdirSync(this.templatesDir, { recursive: true });
        }
    }

    getBuiltInTemplates(): StackTemplate[] {
        return builtInTemplates;
    }

    getCustomTemplates(): StackTemplate[] {
        const templates: StackTemplate[] = [];
        try {
            const files = fs.readdirSync(this.templatesDir);
            for (const file of files) {
                if (file.endsWith(".json")) {
                    const data = fs.readFileSync(path.join(this.templatesDir, file), "utf-8");
                    const template = JSON.parse(data) as StackTemplate;
                    template.isBuiltIn = false;
                    templates.push(template);
                }
            }
        } catch (e) {
            log.error("templates", "Failed to read custom templates: " + (e instanceof Error ? e.message : e));
        }
        return templates;
    }

    getAllTemplates(): StackTemplate[] {
        return [...this.getBuiltInTemplates(), ...this.getCustomTemplates()];
    }

    getTemplate(id: string): StackTemplate | undefined {
        const builtin = builtInTemplates.find(t => t.id === id);
        if (builtin) {
            return builtin;
        }
        const filePath = path.join(this.templatesDir, `${id}.json`);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, "utf-8");
            const template = JSON.parse(data) as StackTemplate;
            template.isBuiltIn = false;
            return template;
        }
        return undefined;
    }

    saveCustomTemplate(template: StackTemplate): void {
        const id = template.id || template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        template.id = id;
        template.isBuiltIn = false;
        const filePath = path.join(this.templatesDir, `${id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
    }

    deleteCustomTemplate(id: string): void {
        // Don't allow deleting built-in templates
        if (builtInTemplates.find(t => t.id === id)) {
            throw new Error("Cannot delete built-in template");
        }
        const filePath = path.join(this.templatesDir, `${id}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
