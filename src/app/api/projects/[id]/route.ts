import { NextRequest } from 'next/server';
import prisma from '../../../../lib/prisma';
import { Prisma } from '@prisma/client';

type RouteParams = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    return Response.json(project);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, description, type, schema } = body as {
      name?: string;
      description?: string | null;
      type?: string | null;
      schema?: Prisma.InputJsonValue;
    };

    if (
      typeof name === 'undefined' &&
      typeof description === 'undefined' &&
      typeof type === 'undefined' &&
      typeof schema === 'undefined'
    ) {
      return Response.json({ error: 'No fields provided to update' }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(typeof name !== 'undefined' ? { name } : {}),
        ...(typeof description !== 'undefined' ? { description } : {}),
        ...(typeof type !== 'undefined' ? { type } : {}),
        ...(typeof schema !== 'undefined' ? { schema } : {}),
      },
      include: { user: true },
    });

    return Response.json(updated);
  } catch (err) {
    console.error(err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }
      if (err.code === 'P2002') {
        return Response.json({ error: 'A project with this name already exists' }, { status: 409 });
      }
    }

    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
