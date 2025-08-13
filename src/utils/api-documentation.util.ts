import listEndpoints from "express-list-endpoints";

export interface EndpointInfo {
  path: string;
  methods: string[];
  middleware: string[];
}

// Type from express-list-endpoints
interface Endpoint {
  path: string;
  methods: string[];
}

export interface ApiDocumentationConfig {
  title: string;
  version: string;
  host: string;
  basePath: string;
  schemes: string[];
  consumes: string[];
  produces: string[];
  securityDefinitions?: any;
  security?: any[];
}

export class ApiDocumentation {
  private app: any; // Using any to avoid type conflicts with express-list-endpoints
  private config: ApiDocumentationConfig;

  constructor(app: any, config: ApiDocumentationConfig) {
    this.app = app;
    this.config = config;
  }

  /**
   * Get all registered endpoints with their methods and middleware
   */
  public getAllEndpoints(): EndpointInfo[] {
    const endpoints = listEndpoints(this.app);
    return endpoints.map((endpoint: Endpoint) => ({
      path: endpoint.path,
      methods: endpoint.methods,
      middleware: [], // express-list-endpoints doesn't provide middleware info
    }));
  }

  /**
   * Generate a simple endpoint list as HTML
   */
  public generateEndpointList(): string {
    const endpoints = this.getAllEndpoints();

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>API Endpoints</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .endpoint { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .method { display: inline-block; padding: 3px 8px; margin: 2px; border-radius: 3px; color: white; font-weight: bold; }
          .get { background-color: #61affe; }
          .post { background-color: #49cc90; }
          .put { background-color: #fca130; }
          .patch { background-color: #50e3c2; }
          .delete { background-color: #f93e3e; }
          .path { font-family: monospace; font-weight: bold; color: #333; }
          .middleware { font-size: 12px; color: #666; margin-top: 5px; }
          .stats { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>API Endpoints Documentation</h1>
        
        <div class="stats">
          <h3>Statistics</h3>
          <p><strong>Total Endpoints:</strong> ${endpoints.length}</p>
          <p><strong>GET:</strong> ${endpoints.filter((e) => e.methods.includes("GET")).length}</p>
          <p><strong>POST:</strong> ${endpoints.filter((e) => e.methods.includes("POST")).length}</p>
          <p><strong>PUT:</strong> ${endpoints.filter((e) => e.methods.includes("PUT")).length}</p>
          <p><strong>PATCH:</strong> ${endpoints.filter((e) => e.methods.includes("PATCH")).length}</p>
          <p><strong>DELETE:</strong> ${endpoints.filter((e) => e.methods.includes("DELETE")).length}</p>
        </div>
        
        <h2>All Endpoints</h2>
    `;

    endpoints.forEach((endpoint) => {
      const methods = endpoint.methods
        .map(
          (method) =>
            `<span class="method ${method.toLowerCase()}">${method}</span>`
        )
        .join(" ");

      const middleware =
        endpoint.middleware.length > 0
          ? `<div class="middleware"><strong>Middleware:</strong> ${endpoint.middleware.join(", ")}</div>`
          : "";

      html += `
        <div class="endpoint">
          <div class="path">${endpoint.path}</div>
          <div>${methods}</div>
          ${middleware}
        </div>
      `;
    });

    html += `
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate a comprehensive API documentation report
   */
  public generateReport(): any {
    const endpoints = this.getAllEndpoints();

    const report = {
      summary: {
        totalEndpoints: endpoints.length,
        methods: {
          GET: endpoints.filter((e) => e.methods.includes("GET")).length,
          POST: endpoints.filter((e) => e.methods.includes("POST")).length,
          PUT: endpoints.filter((e) => e.methods.includes("PUT")).length,
          PATCH: endpoints.filter((e) => e.methods.includes("PATCH")).length,
          DELETE: endpoints.filter((e) => e.methods.includes("DELETE")).length,
        },
        routes: endpoints
          .map((e) => e.path)
          .filter((path, index, arr) => arr.indexOf(path) === index).length,
      },
      endpoints: endpoints.map((endpoint) => ({
        path: endpoint.path,
        methods: endpoint.methods,
        middleware: endpoint.middleware,
      })),
      groupedByPrefix: this.groupEndpointsByPrefix(endpoints),
    };

    return report;
  }

  /**
   * Group endpoints by their prefix (e.g., /api/users, /api/auth)
   */
  private groupEndpointsByPrefix(
    endpoints: EndpointInfo[]
  ): Record<string, EndpointInfo[]> {
    const grouped: Record<string, EndpointInfo[]> = {};

    endpoints.forEach((endpoint) => {
      const prefix = endpoint.path.split("/")[1] || "root";
      if (!grouped[prefix]) {
        grouped[prefix] = [];
      }
      grouped[prefix].push(endpoint);
    });

    return grouped;
  }

  /**
   * Export endpoints to JSON format
   */
  public exportToJson(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  /**
   * Export endpoints to CSV format
   */
  public exportToCsv(): string {
    const endpoints = this.getAllEndpoints();
    let csv = "Path,Methods,Middleware\n";

    endpoints.forEach((endpoint) => {
      const methods = endpoint.methods.join("|");
      const middleware = endpoint.middleware.join("|");
      csv += `"${endpoint.path}","${methods}","${middleware}"\n`;
    });

    return csv;
  }
}
