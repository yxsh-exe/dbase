import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from './prisma';

export interface AuthUser {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
}

/**
 * Get or create a user in the database from Clerk authentication
 * This ensures users are properly synced between Clerk and our database
 */
export async function getOrCreateUser(): Promise<AuthUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.log('No userId found in auth');
      return null;
    }

    console.log('Auth userId:', userId);

    // First, try to find existing user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    console.log('Found user:', user);

    if (user) {
      console.log('Found existing user:', user.email);
      return {
        id: user.id,
        clerkId: user.clerkId!,
        email: user.email,
        name: user.name,
      };
    }

    // If user doesn't exist, get Clerk user data and create
    const clerkUser = await currentUser();
    if (!clerkUser) {
      console.log('No Clerk user found for userId:', userId);
      return null;
    }

    console.log('Creating new user for Clerk user:', clerkUser.emailAddresses[0]?.emailAddress);

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? `${userId}@example.com`,
        name: clerkUser.fullName ?? clerkUser.username ?? null,
      },
    });

    console.log('Created new user:', newUser.email);

    return {
      id: newUser.id,
      clerkId: newUser.clerkId!,
      email: newUser.email,
      name: newUser.name,
    };
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    return null;
  }
}

/**
 * Get the current authenticated user without creating if not exists
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      clerkId: user.clerkId!,
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { userId } = await auth();
    return !!userId;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}
