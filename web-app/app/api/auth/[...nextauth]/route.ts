// file: web-app/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { getDriver } from '@/lib/neo4j';

async function upsertUserInNeo4j(user: any, account: any, profile: any) {
  const driver = getDriver();
  const session = driver.session();

  try {
    const params: any = {
      email: user.email,
      name: user.name,
      image: user.image,
      updated_at: new Date().toISOString(),
    };

    // Add provider-specific fields based on which provider is signing in
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
    console.log(`✅ User stored in Neo4j (via ${account.provider}):`, user.email);
  } catch (error) {
    console.error('❌ Failed to store user in Neo4j:', error);
  } finally {
    await session.close();
  }
}

const { handlers, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  debug: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('Sign in callback:', { user, account, profile });

      // Store user in Neo4j
      if (account && profile) {
        await upsertUserInNeo4j(user, account, profile);
      }

      return true;
    },
    async jwt({ token, user, account }) {
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

export const { GET, POST } = handlers;
export { auth };
