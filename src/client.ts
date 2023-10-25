import { EventEmitter as EE } from "https://deno.land/x/ee_ts@1.0.0/mod.ts";

interface Events {
    message(msg: string): void;
    binary(data: Uint8Array): void;
    close(code: number, reason?: string): void;
    error(): void;
    open(): void;
}

export class Client extends EE<Events> {
    private socket: WebSocket;
    public readonly uuid = crypto.randomUUID();
    constructor(uri: string);
    constructor(socket: WebSocket);
    constructor(init: string | WebSocket) {
        super();
        if (typeof(init) == "string") {
            // URI
            this.socket = new WebSocket(init);
        } else {
            this.socket = init;
        }
        this.socket.addEventListener("open", () => {
            this.emit("open");
        });
        this.socket.addEventListener("message", (ev) => {
            if (typeof(ev.data) == "string") {
                // String message
                this.emit("message", ev.data);
            } else if (ev.data instanceof ArrayBuffer) {
                // Binary
                this.emit("binary", new Uint8Array(ev.data));
            }
        });
        this.socket.addEventListener("error", (_) => {
            this.emit("error");
        });
        this.socket.addEventListener("close", (ev) => {
            this.emit("close", ev.code, ev.reason);
        });
    }
    public send(payload: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        this.socket.send(payload);
    }
    /**
     * Send an object as JSON to the client.
     * @param obj The object to stringify.
     */
    public send_json(obj: object): void {
        const json = JSON.stringify(obj);
        this.send(json);
    }
    public close(code = 1000, reason?: string): void {
        this.socket.close(code, reason);
    }
}