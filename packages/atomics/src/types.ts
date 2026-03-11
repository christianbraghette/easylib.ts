export type InputMessage = {
    buffer: SharedArrayBuffer,
    index: number,
    value: number,
    timeout?: number
}

export type OutputMessage = {
    status: "ok" | "not-equal" | "timed-out",
    index: number
} | {
    status: "error"
    error: unknown
}