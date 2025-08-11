import { NextRequest } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, schema, description, type } = body as {
      name: string;
      schema?: unknown;
      description?: string | null;
      type?: string | null;
    };

    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get or create a default user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'default@example.com',
          name: 'Default User',
        },
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        schema: schema ?? { nodes: [], edges: [] },
        description: description ?? null,
        type: type ?? null,
        userId: user.id,
      },
      include: { user: true },
    });

    return Response.json(project, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { user: true },
    });
    return Response.json(projects);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
