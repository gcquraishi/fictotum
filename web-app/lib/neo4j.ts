import 'server-only';
import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI?.trim();
    const username = process.env.NEO4J_USERNAME?.trim();
    const password = process.env.NEO4J_PASSWORD?.trim();

    if (!uri || !username || !password) {
      throw new Error(
        'Missing Neo4j environment variables (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD). ' +
        'This is expected during `next build` if env vars are not available.'
      );
    }

    // Configuration for Neo4j Aura — tuned for serverless (Vercel)
    driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
      {
        maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes (serverless functions are short-lived)
        maxConnectionPoolSize: 10, // Vercel functions share a cold-start pool; 50 was too high
        connectionAcquisitionTimeout: 30 * 1000, // 30 seconds (was 2 min — fail fast in serverless)
        connectionTimeout: 15 * 1000, // 15 seconds to establish connection
        disableLosslessIntegers: true,
      }
    );
  }

  return driver;
}

export async function getSession(): Promise<Session> {
  const driver = getDriver();
  return driver.session();
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
