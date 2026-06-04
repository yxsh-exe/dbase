import { NextRequest } from 'next/server';
import prisma from '../../../lib/prisma';
import { auth } from '../../../lib/auth';
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user;
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
  } catch {
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user;
    if (!user) {
      return Response.json([], { status: 200 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { user: true },
    });
    return Response.json(projects);
  } catch {
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
