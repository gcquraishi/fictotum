import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

async function upsertUserInNeo4j(user: any, account: any, profile: any) {
  try {
    const { getSession } = await import('./neo4j');
    const session = await getSession();

    try {
      const params: any = {
        email: user.email,
        name: user.name,
        image: user.image,
        updated_at: new Date().toISOString(),
      };

      if (account.provider === 'github') {
        params.github_username = profile?.login;
        params.github_id = account.providerAccountId;
      } else if (account.provider === 'google') {
        params.google_email = profile?.email;
        params.google_id = account.providerAccountId;
      }

      await session.run(
        `
        MERGE (u:User {email: $email})
        ON CREATE SET u.created_at = datetime()
        SET u.name = $name,
            u.image = $image,
            u.updated_at = datetime()
        ${account.provider === 'github' ? `
        SET u.github_username = $github_username,
            u.github_id = $github_id
        ` : ''}
        ${account.provider === 'google' ? `
        SET u.google_email = $google_email,
            u.google_id = $google_id
        ` : ''}
        RETURN u
        `,
        params
      );
    } finally {
      await session.close();
    }
  } catch (error) {
    // Log but don't throw — a Neo4j failure should not block sign-in
    console.error('[Auth] Failed to upsert user in Neo4j:', error);
  }
}

// Detect whether OAuth env vars are configured.
// Auth.js crashes at startup if provider credentials are undefined,
// so we conditionally include providers only when keys exist.
const githubConfigured = !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET);
const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const providers = [
  ...(githubConfigured
    ? [GitHub({
        clientId: process.env.GITHUB_ID!.trim(),
        clientSecret: process.env.GITHUB_SECRET!.trim(),
      })]
    : []),
  ...(googleConfigured
    ? [Google({
        clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      })]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(error) {
      console.error('[Auth] Error:', error);
    },
    warn(code) {
      console.warn('[Auth] Warning:', code);
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && profile) {
        await upsertUserInNeo4j(user, account, profile);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

/** True if at least one OAuth provider is configured in this environment. */
export const authConfigured = githubConfigured || googleConfigured;
