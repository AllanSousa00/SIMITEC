// Middleware de autenticacao e permissao.
// Aqui fica o "pode entrar?" do sistema: participante, credenciamento,
// administracao e administracao geral.
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const AUTH_COOKIE = "simitec_session";
export const SENSITIVE_ACCESS_HEADER = "x-sensitive-access";
export const MOBILE_SESSION_HEADER = "x-simitec-mobile-app";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

export function jwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("troque") || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET precisa estar configurado com uma chave segura.");
  }

  return process.env.JWT_SECRET;
}

export function createSessionToken(user) {
  // O token guarda quem e a pessoa e qual cargo ela tem.
  // Sem senha passeando pelo navegador, por favor.
  const subject = user._id?.toString?.() || user.id?.toString?.();
  return jwt.sign({ sub: subject, role: user.role }, jwtSecret(), {
    expiresIn: "7d"
  });
}

export function createSensitiveAccessToken(user) {
  const subject = user._id?.toString?.() || user.id?.toString?.();
  return jwt.sign({ sub: subject, purpose: "sensitive-access" }, jwtSecret(), {
    expiresIn: "5m"
  });
}

export function hasSensitiveAccess(req, user = req.user || req.localUser) {
  const token = String(req.get(SENSITIVE_ACCESS_HEADER) || "").trim();
  const subject = user?._id?.toString?.() || user?.id?.toString?.();
  if (!token || !subject) return false;

  try {
    const payload = jwt.verify(token, jwtSecret());
    return payload.purpose === "sensitive-access" && payload.sub === subject;
  } catch (_error) {
    return false;
  }
}

export function setSessionCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(AUTH_COOKIE, SESSION_COOKIE_OPTIONS);
}

export function getSessionToken(req) {
  const cookieToken = String(req.cookies?.[AUTH_COOKIE] || "").trim();
  if (cookieToken) return cookieToken;

  const authorization = String(req.get("authorization") || "").trim();
  const [, bearerToken = ""] = authorization.match(/^Bearer\s+(.+)$/i) || [];
  return bearerToken.trim();
}

export function mobileSessionPayload(req, token) {
  return String(req.get(MOBILE_SESSION_HEADER) || "") === "1"
    ? { sessionToken: token }
    : {};
}

export async function requireAuth(req, res, next) {
  try {
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ message: "Entre na sua conta para continuar." });
    }

    const payload = jwt.verify(token, jwtSecret());
    const user = await User.findById(payload.sub);

    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ message: "Sessão inválida. Entre novamente." });
    }

    req.user = user;
    return next();
  } catch (_error) {
    clearSessionCookie(res);
    return res.status(401).json({ message: "Sessão expirada. Entre novamente." });
  }
}

export function optionalAuth(req, res, next) {
  if (!getSessionToken(req)) {
    req.user = null;
    return next();
  }

  return requireAuth(req, res, next);
}

export function requireVerifiedEmail(req, res, next) {
  if (!req.user?.emailVerified) {
    return res.status(403).json({
      message: "Confirme seu e-mail antes de realizar inscrições."
    });
  }

  return next();
}

export function isAdminRole(role) {
  return ["admin", "super_admin"].includes(role);
}

export function isCheckinRole(role) {
  return ["checkin", "admin", "super_admin"].includes(role);
}

export function requireCheckin(req, res, next) {
  if (!isCheckinRole(req.user?.role)) {
    return res.status(403).json({ message: "Acesso restrito à equipe de credenciamento." });
  }

  return next();
}

export function requireAdmin(req, res, next) {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ message: "Acesso restrito a administradores." });
  }

  return next();
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Acesso restrito ao administrador principal." });
  }

  return next();
}
