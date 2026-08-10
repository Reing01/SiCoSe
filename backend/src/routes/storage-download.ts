import { Router } from "express";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/require-role.js";
import type { AuthenticatedRequest } from "../types/auth.js";

const STORAGE_PATH_PREFIX = "/storage/v1/object/";
const STORAGE_MODES = new Set(["authenticated", "public", "sign"]);

type SupabaseStorageConfig = {
  origin: string;
  serviceKey: string;
};

function getSupabaseStorageConfig(): SupabaseStorageConfig | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return null;
  }

  return {
    origin: new URL(env.SUPABASE_URL).origin,
    serviceKey: env.SUPABASE_SERVICE_KEY,
  };
}

function getRequestedUrl(request: AuthenticatedRequest) {
  const value = request.query.url;

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];

    return typeof firstValue === "string" ? firstValue.trim() : "";
  }

  return "";
}

function isAllowedStorageUrl(candidate: URL, supabaseOrigin: string) {
  if (candidate.origin !== supabaseOrigin) {
    return false;
  }

  if (!candidate.pathname.startsWith(STORAGE_PATH_PREFIX)) {
    return false;
  }

  const segments = candidate.pathname.split("/").filter(Boolean);
  const storageMode = segments[3];
  const bucket = segments[4];

  return (
    STORAGE_MODES.has(storageMode) &&
    bucket === env.SUPABASE_STORAGE_BUCKET &&
    segments.length >= 6
  );
}

export const storageDownloadRouter = Router();

storageDownloadRouter.get(
  "/",
  authenticate,
  async (request: AuthenticatedRequest, response) => {
    const sourceUrl = getRequestedUrl(request);

    if (!sourceUrl) {
      return response.status(400).json({
        error: "Missing file url",
        code: 400,
      });
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return response.status(400).json({
        error: "Invalid file url",
        code: 400,
      });
    }

    const supabaseConfig = getSupabaseStorageConfig();

    if (!supabaseConfig) {
      return response.status(503).json({
        error: "Supabase Storage is not configured",
        code: 503,
      });
    }

    if (!isAllowedStorageUrl(parsedUrl, supabaseConfig.origin)) {
      return response.status(400).json({
        error: "File url is not allowed",
        code: 400,
      });
    }

    let upstreamResponse: Response;

    try {
      upstreamResponse = await fetch(parsedUrl.toString(), {
        headers: {
          Authorization: `Bearer ${supabaseConfig.serviceKey}`,
          apikey: supabaseConfig.serviceKey,
        },
      });
    } catch {
      return response.status(502).json({
        error: "No fue posible conectar con el almacenamiento.",
        code: 502,
      });
    }

    if (!upstreamResponse.ok) {
      const details = await upstreamResponse.text().catch(() => "");

      return response.status(upstreamResponse.status).json({
        error:
          details.trim() ||
          "No fue posible descargar el archivo solicitado.",
        code: upstreamResponse.status,
      });
    }

    const passthroughHeaders = [
      "content-type",
      "content-disposition",
      "cache-control",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ];

    for (const headerName of passthroughHeaders) {
      const headerValue = upstreamResponse.headers.get(headerName);

      if (headerValue) {
        response.setHeader(headerName, headerValue);
      }
    }

    const body = Buffer.from(await upstreamResponse.arrayBuffer());

    return response.status(upstreamResponse.status).send(body);
  },
);
