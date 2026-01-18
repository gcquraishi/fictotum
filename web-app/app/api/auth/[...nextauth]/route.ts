// file: web-app/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { Neo4jAdapter } from '@auth/neo4j-adapter';
import { getDriver } from '@/lib/neo4j';

const driver = getDriver();

const { handlers } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  adapter: Neo4jAdapter(driver),
});

export const { GET, POST } = handlers;
