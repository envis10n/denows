import { EventEmitter as EE } from "https://deno.land/x/ee_ts@1.0.0/mod.ts"
import { Client } from "./client.ts";

interface Events {
    connect(client: Client): void;
    message(client: Client, payload: string): void;
    error(client: Client): void;
    binary(client: Client, payload: Uint8Array): void;
    disconnect(client: Client, code: number, reason?: string): void;
}

export class Server extends EE<Events> {
    private server: Deno.Server | null = null;
    private clients: Map<string, Client> = new Map();
    constructor(public readonly hostname = "127.0.0.1", public readonly port = 3000) {
        super();
    }
    public broadcast(payload: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        for (const client of this.clients.values()) {
            client.send(payload);
        }
    }
    public async close(): Promise<void> {
        await this.server?.shutdown();
        this.clients.clear();
    }
    public listen(): void {
        this.server = Deno.serve({hostname: this.hostname, port: this.port}, (req) => {
            if (req.headers.get("upgrade") != "websocket") {
                return new Response(null, {status: 501});
            }
            const {socket, response} = Deno.upgradeWebSocket(req);
            socket.binaryType = "arraybuffer";
            const client = new Client(socket);
            this.clients.set(client.uuid, client);
            client.on("message", (msg) => {
                this.emit("message", client, msg);
            });
            client.on("binary", (data) => {
                this.emit("binary", client, data);
            });
            client.on("error", () => {
                this.emit("error", client);
            });
            client.on("close", (code, reason) => {
                this.emit("disconnect", client, code, reason);
                this.clients.delete(client.uuid);
            });
            this.emit("connect", client);
            return response;
        });
    }
}