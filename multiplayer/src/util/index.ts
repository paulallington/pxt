import zlib from "zlib";

export const SHORT_LINKS = {
    PROD: "https://aka.ms/a9",
    PROD_BETA: "https://aka.ms/a9b",
    STAGING: "https://aka.ms/a9s",
    STAGING_BETA: "https://aka.ms/a9sb",
    LOCAL: "http://localhost:3000",
};

export const SHORT_LINK = () => {
    if (pxt.BrowserUtils.isLocalHostDev()) {
        return SHORT_LINKS.LOCAL;
    } else if (window.location.hostname === "arcade.makecode.com") {
        if (window.location.pathname.startsWith("/beta")) {
            return SHORT_LINKS.PROD_BETA;
        } else {
            return SHORT_LINKS.PROD;
        }
    } else {
        if (window.location.pathname.startsWith("/beta")) {
            return SHORT_LINKS.STAGING_BETA;
        } else {
            return SHORT_LINKS.STAGING;
        }
    }
};

export function makeHostLink(shareUrlOrCode: string) {
    return `${SHORT_LINK()}?host=${encodeURIComponent(shareUrlOrCode)}`;
}

export function makeJoinLink(joinCode: string) {
    return `${SHORT_LINK()}?join=${encodeURIComponent(joinCode)}`;
}

export function isLocal() {
    return window.location.hostname === "localhost";
}

export function toNumber(v: any): number | undefined {
    if (v == null) return undefined;
    if (typeof v === "number") return v;
    return parseFloat(v);
}

export function xorInPlace(a: Buffer, b: Buffer): Buffer {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
        a[i] ^= b[i];
    }
    return a;
}

export function gzipAsync(data: zlib.InputType): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        zlib.gzip(data, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

export function gunzipAsync(data: zlib.InputType): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        zlib.gunzip(data, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

export function cleanupJoinCode(
    joinCode: string | undefined
): string | undefined {
    try {
        const url = new URL(joinCode || "");
        if (url.searchParams.has("join")) {
            joinCode = url.searchParams.get("join") ?? undefined;
        }
    } catch {}
    if (!joinCode) return undefined;
    joinCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (joinCode.length !== 6) return undefined;
    return joinCode;
}

export function cleanupShareCode(
    shareCode: string | undefined
): string | undefined {
    try {
        const url = new URL(shareCode || "");
        if (url.searchParams.has("host")) {
            shareCode = url.searchParams.get("host") ?? undefined;
        }
    } catch {}
    if (!shareCode) return undefined;
    return pxt.Cloud.parseScriptId(shareCode);
}
