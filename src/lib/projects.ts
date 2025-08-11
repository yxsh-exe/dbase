export type ProjectType = 'RELATIONAL' | 'NOSQL' | 'HYBRID';

export interface ProjectUser {
  name?: string | null;
  email?: string | null;
}

export interface Project<TSchema = any> {
  id: string;
  name: string;
  description?: string | null;
  type?: ProjectType | null;
  createdAt: string;
  updatedAt?: string;
  user?: ProjectUser;
  schema?: TSchema;
}

export async function createProject(input: {
  name: string;
  description?: string | null;
  type?: ProjectType | null;
  schema?: unknown;
}): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function updateProject(
  id: string,
  update: {
    name?: string;
    description?: string | null;
    type?: ProjectType | null;
    schema?: unknown;
  },
): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(id: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
  return res.json();
}
