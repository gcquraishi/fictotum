// file: web-app/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { getDriver } from '@/lib/neo4j';

async function upsertUserInNeo4j(user: any, account: any, profile: any) {
  const driver = getDriver();
  const session = driver.session();

  try {
    await session.run(
      `
      MERGE (u:User {provider: $provider, providerId: $providerId})
      ON CREATE SET u.created_at = datetime()
      SET u.email = $email,
          u.name = $name,
          u.image = $image,
          u.github_username = $github_username,
          u.updated_at = datetime()
      RETURN u
      `,
      {
        provider: account.provider,
        providerId: account.providerAccountId,
        email: user.email,
        name: user.name || profile?.login,
        image: user.image,
        github_username: profile?.login,
      }
    );
    console.log('✅ User stored in Neo4j:', user.email);
  } catch (error) {
    console.error('❌ Failed to store user in Neo4j:', error);
  } finally {
    await session.close();
  }
}

const { handlers } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
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
