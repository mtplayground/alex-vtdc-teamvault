import type { Request } from "express";
import jwt, { type JwtHeader, type SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import type { Pool } from "pg";
import { config } from "../config";
import { upsertAuthenticatedUser } from "../db/repositories";
import type { UserRecord } from "../db/types";

export interface SessionClaims {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  aud: string;
  iss: string;
}

export interface AuthenticatedSession {
  claims: SessionClaims;
  user: UserRecord;
  isNewRegistration: boolean;
}

const jwks = jwksClient({ jwksUri: config.auth.jwksUrl });

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback) {
  if (!header.kid) {
    callback(new Error("Session token is missing a key id."));
    return;
  }

  jwks.getSigningKey(header.kid, (error, key) => {
    if (error) {
      callback(error);
      return;
    }

    if (!key) {
      callback(new Error("Session signing key was not found."));
      return;
    }

    callback(null, key.getPublicKey());
  });
}

function isSessionClaims(value: unknown): value is SessionClaims {
  if (!value || typeof value !== "object") {
    return false;
  }

  const claims = value as Partial<SessionClaims>;
  return typeof claims.sub === "string" && typeof claims.email === "string";
}

export async function verifySession(req: Request): Promise<SessionClaims | null> {
  const token = req.cookies?.mctai_session;

  if (!token) {
    return null;
  }

  try {
    const claims = await new Promise<unknown>((resolve, reject) => {
      jwt.verify(
        token,
        getSigningKey,
        {
          audience: config.auth.appToken,
          issuer: config.auth.url,
        },
        (error, decoded) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(decoded);
        },
      );
    });

    return isSessionClaims(claims) ? claims : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedSession(req: Request, dbPool: Pool): Promise<AuthenticatedSession | null> {
  const claims = await verifySession(req);

  if (!claims) {
    return null;
  }

  const { user, isNew } = await upsertAuthenticatedUser(dbPool, {
    sub: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified ?? false,
    name: claims.name ?? null,
    pictureUrl: claims.picture ?? null,
  });

  return {
    claims,
    user,
    isNewRegistration: isNew,
  };
}
