// Minimal type declarations for express (not installed as dependency)
declare module 'express' {
  export interface Request {
    body: any;
    params: Record<string, string>;
    query: Record<string, string | string[] | undefined>;
    headers: Record<string, string | string[] | undefined>;
    method: string;
    url: string;
    path: string;
    originalUrl: string;
    ip?: string;
    route?: { path: string };
    get(name: string): string | undefined;
    authorization?: string;
    [key: string]: any;
  }

  export interface Response {
    statusCode: number;
    status(code: number): Response;
    json(body: any): void;
    send(body?: any): Response;
    set(name: string, value: string): Response;
    set(headers: Record<string, string>): Response;
    header(name: string, value: string): Response;
    [key: string]: any;
  }

  export type NextFunction = (err?: any) => void;

  export interface Router {
    get(path: string, ...handlers: Array<(req: any, res: any, next?: any) => any>): Router;
    post(path: string, ...handlers: Array<(req: any, res: any, next?: any) => any>): Router;
    put(path: string, ...handlers: Array<(req: any, res: any, next?: any) => any>): Router;
    delete(path: string, ...handlers: Array<(req: any, res: any, next?: any) => any>): Router;
    patch(path: string, ...handlers: Array<(req: any, res: any, next?: any) => any>): Router;
    use(...handlers: Array<any>): Router;
  }

  export function Router(): Router;

  export interface Application extends Router {
    listen(port: number, callback?: () => void): any;
    use(...handlers: Array<any>): Application;
  }

  export default function express(): Application;
}
