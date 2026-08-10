import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { signAuthToken, verifyAuthToken } from "../lib/jwt.js";
import { getRefreshCookieOptions } from "../lib/refresh-cookie.js";
import {
  consumeRefreshToken,
  issueRefreshToken,
  REFRESH_TOKEN_COOKIE,
  revokeRefreshToken,
} from "../lib/refresh-token.js";
import { blacklistToken, isTokenBlacklisted } from "../lib/token-blacklist.js";
import {
  loginRateLimit,
  resetLoginEmailAttempts,
} from "../middleware/rate-limit.js";
import { auditLogger } from "../services/audit.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function getBearerToken(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) {
    return "";
  }

  return header.slice("Bearer ".length).trim();
}

function setRefreshCookie(
  response: Response,
  token: string,
  ttlSeconds: number,
) {
  const secure = env.COOKIE_SECURE ?? env.NODE_ENV === "production";
  response.cookie(
    REFRESH_TOKEN_COOKIE,
    token,
    getRefreshCookieOptions(secure, ttlSeconds * 1000),
  );
}

function clearRefreshCookie(response: Response) {
  const secure = env.COOKIE_SECURE ?? env.NODE_ENV === "production";
  response.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshCookieOptions(secure));
}

function getRequestIp(request: Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return response.status(400).json({
        error: "Invalid credentials payload",
        details: parsed.error.flatten(),
      });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: parsed.data.email },
    });

    const passwordHash = user?.passwordHash ?? "";
    const validPassword =
      Boolean(user?.activo) &&
      (await bcrypt.compare(parsed.data.password, passwordHash));

    if (!user || !validPassword) {
      return response.status(401).json({
        error: "Invalid email or password",
        code: 401,
      });
    }

    const [token, refreshSession] = await Promise.all([
      signAuthToken({
        sub: user.id,
        email: user.email,
        rol: user.rol,
      }),
      issueRefreshToken(user.id),
      resetLoginEmailAttempts(user.email),
    ]);

    const { token: refreshToken, ttlSeconds } = refreshSession;
    setRefreshCookie(response, refreshToken, ttlSeconds);

    return response.json({
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", async (request, response) => {
  const token = getBearerToken(request.headers.authorization);

  if (!token) {
    return response.status(401).json({
      error: "Missing bearer token",
      code: 401,
    });
  }

  if (await isTokenBlacklisted(token)) {
    return response.status(401).json({
      error: "Invalid or expired token",
      code: 401,
    });
  }

  try {
    const payload = await verifyAuthToken(token);
    const user = await prisma.usuario.findFirst({
      where: {
        id: payload.sub,
        activo: true,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    });

    if (!user) {
      return response.status(401).json({
        error: "Invalid or expired token",
        code: 401,
      });
    }

    return response.json({
      data: user,
    });
  } catch {
    return response.status(401).json({
      error: "Invalid or expired token",
      code: 401,
    });
  }
});

authRouter.post("/refresh", async (request, response) => {
  const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE];

  if (!refreshToken) {
    return response.status(401).json({
      error: "Missing refresh token",
      code: 401,
    });
  }

  const userId = await consumeRefreshToken(refreshToken);

  if (!userId) {
    clearRefreshCookie(response);
    return response.status(401).json({
      error: "Invalid or expired token",
      code: 401,
    });
  }

  const user = await prisma.usuario.findFirst({
    where: { id: userId, activo: true },
  });

  if (!user) {
    clearRefreshCookie(response);
    return response.status(401).json({
      error: "Invalid or expired token",
      code: 401,
    });
  }

  const token = await signAuthToken({
    sub: user.id,
    email: user.email,
    rol: user.rol,
  });

  const { token: newRefreshToken, ttlSeconds } = await issueRefreshToken(
    user.id,
  );
  setRefreshCookie(response, newRefreshToken, ttlSeconds);

  return response.json({
    message: "Token refreshed",
    data: { token },
  });
});

authRouter.post("/logout", async (request, response, next) => {
  const token = getBearerToken(request.headers.authorization);
  const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE];
  let logoutUserId = "";

  try {
    if (token) {
      try {
        const payload = await verifyAuthToken(token);
        logoutUserId = payload.sub;
        await blacklistToken(token, payload.exp);
      } catch {
        // Un access token vencido no debe impedir revocar el refresh token.
      }
    }

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    clearRefreshCookie(response);

    if (logoutUserId) {
      try {
        await auditLogger(prisma, {
          usuarioId: logoutUserId,
          accion: "LOGOUT",
          entidad: "Usuario",
          entidadId: logoutUserId,
          ip: getRequestIp(request),
          detalles: {
            refreshTokenRevocado: Boolean(refreshToken),
          },
        });
      } catch {
        // La auditoria no debe bloquear el cierre de sesion del usuario.
      }
    }

    return response.json({
      message: "Logout successful",
    });
  } catch (error) {
    clearRefreshCookie(response);
    return next(error);
  }
});
