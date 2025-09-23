import NextAuth from "next-auth";
import type { NextAuthOptions, Account, Profile, Session, User, TokenSet } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { OAuthConfig } from "next-auth/providers/oauth";

const issuerRaw = process.env.ADFS_ISSUER ?? "";
const issuer = issuerRaw.replace(/\/$/, "");

type ADFSProfile = Profile & {
  upn?: string;
  unique_name?: string;
  given_name?: string;
  family_name?: string;
};

const mahidolProvider: OAuthConfig<ADFSProfile> = {
  id: "mahidol",
  name: "Mahidol ADFS",
  type: "oauth",
  // prefer OIDC discovery when available
  wellKnown: issuer ? `${issuer}/.well-known/openid-configuration` : undefined,
  authorization: issuer
    ? {
        url: `${issuer}/oauth2/authorize`,
        params: {
          scope: "openid profile email",
          response_mode: "query",
          ...(process.env.ADFS_RESOURCE ? { resource: process.env.ADFS_RESOURCE } : {}),
        },
      }
    : undefined,
  token: issuer ? `${issuer}/oauth2/token` : undefined,
  userinfo: issuer ? `${issuer}/userinfo` : undefined,
  clientId: process.env.ADFS_CLIENT_ID,
  clientSecret: process.env.ADFS_CLIENT_SECRET,
  checks: ["pkce", "state"],
  // profile receives either the /userinfo result or the decoded id_token claims
  profile(profile: ADFSProfile) {
    const id = profile.sub ?? profile.upn ?? profile.unique_name ?? "";
    const given = profile.given_name ?? undefined;
    const family = profile.family_name ?? undefined;
    const nameFromParts = [given, family].filter(Boolean).join(" ");
    const name = profile.name ?? (nameFromParts ? nameFromParts : profile.upn ?? profile.unique_name ?? "");
    const email = profile.email ?? profile.upn ?? null;
    return {
      id,
      name,
      email,
    } as User;
  },
};

export const authOptions: NextAuthOptions = {
  providers: [mahidolProvider],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }: { token: JWT; account?: Account | null; profile?: Profile | undefined }): Promise<JWT> {
      // account may include token fields (access_token, id_token) depending on provider
      if (account) {
        const acct = account as Partial<TokenSet> & Account;
        const access = acct.access_token ?? ((acct as unknown) as Record<string, unknown>)['accessToken']; // fallback naming
        if (access) {
          (token as Record<string, unknown>)["accessToken"] = access as string;
        }
      }
      if (profile) {
        (token as Record<string, unknown>)["name"] = (token as Record<string, unknown>)["name"] ?? profile.name ?? undefined;
        (token as Record<string, unknown>)["email"] = (token as Record<string, unknown>)["email"] ?? profile.email ?? undefined;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      const t = token as Record<string, unknown>;
      if (t["name"] && session.user) session.user.name = t["name"] as string;
      if (t["email"] && session.user) session.user.email = t["email"] as string;
  if (t["accessToken"]) ((session as unknown) as Record<string, unknown>)["accessToken"] = t["accessToken"];
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
