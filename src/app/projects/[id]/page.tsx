"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import {
    ArrowLeft,
    CalendarClock,
    Code2,
    Database,
    Download,
    Edit3,
    Layers3,
    Trash2,
    User as UserIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus"
import dracula from "react-syntax-highlighter/dist/esm/styles/prism/dracula"
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSession } from "@/lib/auth-client"
import type { Edge, Node } from "@xyflow/react"
import type { TableNodeData } from "@/components/editor/nodes/types/Field"
import { convertSchema, type SchemaFormat } from "@/components/editor/utils/convertSchema"

interface PageProps {
    params: Promise<{ id: string }>
}

interface ProjectUser {
    name?: string | null
    email?: string | null
}

interface Project {
    id: string
    name: string
    description?: string | null
    type?: "RELATIONAL" | "NOSQL" | "HYBRID" | null
    createdAt: string
    updatedAt?: string
    user?: ProjectUser
    schema: {
        nodes: Node<TableNodeData>[]
        edges: Edge[]
        metadata?: Record<string, unknown>
    } | null
}

// Register a minimal set of languages for highlighting (module-level flag to avoid duplicate registration)
let prismLanguagesRegistered = false
if (!prismLanguagesRegistered) {
    SyntaxHighlighter.registerLanguage?.("sql", sql)
    SyntaxHighlighter.registerLanguage?.("typescript", typescript)
    prismLanguagesRegistered = true
}

export default function ProjectPage({ params }: PageProps) {
    const router = useRouter()
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [exportFormat, setExportFormat] = useState<SchemaFormat>("sql")
    const [isEditingName, setIsEditingName] = useState(false)
    const [editName, setEditName] = useState("")
    const [isSavingName, setIsSavingName] = useState(false)
    const { data: session, isPending: isSessionPending } = useSession()

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const { id } = await params
                const res = await fetch(`/api/projects/${id}`)
                if (!res.ok) throw new Error("Failed to load project")
                const data = await res.json()
                setProject(data)
            } catch (e) {
                console.error(e)
                setError("Failed to load project")
                toast.error("Failed to load project")
            } finally {
                setLoading(false)
            }
        }
        void load()
    }, [params])

    const nodes: Node<TableNodeData>[] = useMemo(() => project?.schema?.nodes ?? [], [project])
    const edges: Edge[] = useMemo(() => project?.schema?.edges ?? [], [project])

    const exportCode = useMemo(() => convertSchema(nodes, edges, exportFormat), [nodes, edges, exportFormat])

    const handleCopyExport = async () => {
        try {
            await navigator.clipboard.writeText(exportCode)
            toast.success("Copied to clipboard")
        } catch {
            toast.error("Copy failed")
        }
    }

    const handleDownloadExport = () => {
        const ext = exportFormat === "sql" ? "sql" : exportFormat === "prisma" ? "prisma" : "ts"
        const base = exportFormat === "prisma" ? "schema" : exportFormat === "drizzle" ? "schema.drizzle" : "schema"
        const blob = new Blob([exportCode], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${project?.name ?? base}.${ext}`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleDelete = async () => {
        try {
            const { id } = await params
            const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Delete failed")
            toast.success("Project deleted")
            router.push("/projects")
        } catch (e) {
            console.error(e)
            toast.error("Failed to delete project")
        }
    }

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "N/A"
        try {
            return new Date(dateString).toLocaleString()
        } catch {
            return "N/A"
        }
    }

    const typeBadge = (type?: Project["type"]) => {
        if (!type) return null
        const variant = type === "RELATIONAL" ? "secondary" : type === "NOSQL" ? "outline" : "default"
        return <Badge variant={variant}>{type}</Badge>
    }

    const handleStartEditingName = () => {
        if (!project) return
        setEditName(project.name)
        setIsEditingName(true)
    }

    const handleSaveName = async () => {
        if (!project) return
        const newName = editName.trim()
        if (!newName || newName === project.name) {
            setIsEditingName(false)
            return
        }
        try {
            setIsSavingName(true)
            const { id } = await params
            const res = await fetch(`/api/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName }),
            })
            if (!res.ok) throw new Error("Rename failed")
            const updated: Project = await res.json()
            setProject(updated)
            toast.success("Project renamed")
            setIsEditingName(false)
        } catch (e) {
            console.error(e)
            toast.error("Failed to rename project")
        } finally {
            setIsSavingName(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
        )
    }

    if (error || !project) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-destructive">{error ?? "Project not found"}</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b bg-card">
                <div className="max-w-7xl mx-auto px-6 py-5 flex items-start md:items-center justify-between gap-4">
                    <div className="flex items-start md:items-center gap-4 min-w-0">
                        <Link href="/projects" className="shrink-0">
                            <Button variant="outline" size="icon" aria-label="Back">
                                <ArrowLeft />
                            </Button>
                        </Link>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                {isEditingName ? (
                                    <Input
                                        autoFocus
                                        value={editName}
                                        disabled={isSavingName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => void handleSaveName()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.currentTarget.blur()
                                            } else if (e.key === "Escape") {
                                                setIsEditingName(false)
                                            }
                                        }}
                                        className="h-auto py-0 px-1 text-2xl font-semibold truncate w-[min(60vw,32rem)]"
                                    />
                                ) : (
                                    <h1
                                        className="text-2xl font-semibold truncate cursor-text select-text"
                                        onDoubleClick={handleStartEditingName}
                                        title="Double-click to rename"
                                    >
                                        {project.name}
                                    </h1>
                                )}
                                {typeBadge(project.type ?? undefined)}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1"><UserIcon className="size-4" /> {project.user?.name ?? project.user?.email ?? "Unknown"}</span>
                                <span className="inline-flex items-center gap-1"><CalendarClock className="size-4" /> Updated {formatDate(project.updatedAt ?? project.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!session && !isSessionPending ? (
                            <Link href="/sign-in">
                                <Button>
                                    <Edit3 /> Log in to edit
                                </Button>
                            </Link>
                        ) : session ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href={`/projects/${project.id}/editor`}>
                                        <Button>
                                            <Edit3 /> Open editor
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>Start modeling</TooltipContent>
                            </Tooltip>
                        ) : null}
                        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 /> Delete
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Delete project</DialogTitle>
                                    <DialogDescription>
                                        This action cannot be undone. This will permanently delete &quot;{project.name}&quot;
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                                    <Button variant="destructive" onClick={() => void handleDelete()}>Delete</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl border bg-card p-6">
                        <h2 className="text-lg font-semibold">Overview</h2>
                        {project.description && (
                            <p className="text-muted-foreground mt-2 leading-relaxed">{project.description}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            <div className="rounded-md border p-3">
                                <div className="text-muted-foreground text-sm flex items-center gap-2 mb-1"><Database className="size-4" /> Tables</div>
                                <div className="text-xl font-semibold">{nodes.length}</div>
                            </div>
                            <div className="rounded-md border p-3">
                                <div className="text-muted-foreground text-sm flex items-center gap-2 mb-1"><Layers3 className="size-4" /> Relationships</div>
                                <div className="text-xl font-semibold">{edges.length}</div>
                            </div>
                            <div className="rounded-md border p-3">
                                <div className="text-muted-foreground text-sm mb-1">Created</div>
                                <div className="text-xl font-semibold">{new Date(project.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div className="rounded-md border p-3">
                                <div className="text-muted-foreground text-sm mb-1">Updated</div>
                                <div className="text-xl font-semibold">{new Date(project.updatedAt ?? project.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2"><Code2 className="size-5" /> Export schema</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => void handleCopyExport()}>Copy</Button>
                                <Button variant="outline" onClick={handleDownloadExport}><Download /> Download</Button>
                            </div>
                        </div>
                        <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as SchemaFormat)} className="mt-4">
                            <TabsList>
                                <TabsTrigger value="sql">SQL</TabsTrigger>
                                <TabsTrigger value="prisma">Prisma</TabsTrigger>
                                <TabsTrigger value="drizzle">Drizzle</TabsTrigger>
                            </TabsList>
                            <TabsContent value="sql">
                                <div className="mt-3 rounded-md border bg-background overflow-hidden">
                                    <SyntaxHighlighter
                                        language="sql"
                                        style={vscDarkPlus}
                                        wrapLongLines
                                        customStyle={{ background: "transparent", margin: 0, padding: 16, fontSize: 13, lineHeight: 1.7 }}
                                        codeTagProps={{
                                            style: {
                                                fontFamily:
                                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            },
                                        }}
                                    >
                                        {exportCode}
                                    </SyntaxHighlighter>
                                </div>
                            </TabsContent>
                            <TabsContent value="prisma">
                                <div className="mt-3 rounded-md border bg-background overflow-hidden">
                                    <SyntaxHighlighter
                                        language="typescript"
                                        style={dracula}
                                        wrapLongLines
                                        customStyle={{ background: "transparent", margin: 0, padding: 16, fontSize: 13, lineHeight: 1.7 }}
                                        codeTagProps={{
                                            style: {
                                                fontFamily:
                                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            },
                                        }}
                                    >
                                        {exportCode}
                                    </SyntaxHighlighter>
                                </div>
                            </TabsContent>
                            <TabsContent value="drizzle">
                                <div className="mt-3 rounded-md border bg-background overflow-hidden">
                                    <SyntaxHighlighter
                                        language="typescript"
                                        style={dracula}
                                        wrapLongLines
                                        customStyle={{ background: "transparent", margin: 0, padding: 16, fontSize: 13, lineHeight: 1.7 }}
                                        codeTagProps={{
                                            style: {
                                                fontFamily:
                                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            },
                                        }}
                                    >
                                        {exportCode}
                                    </SyntaxHighlighter>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border bg-card p-6">
                        <h3 className="text-lg font-semibold mb-3">Project info</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Owner</span><span>{project.user?.name ?? project.user?.email ?? "—"}</span></div>
                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Type</span><span>{project.type ?? "—"}</span></div>
                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Created</span><span>{formatDate(project.createdAt)}</span></div>
                            <div className="flex items-center justify-between"><span className="text-muted-foreground">Last update</span><span>{formatDate(project.updatedAt ?? project.createdAt)}</span></div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6">
                        <h3 className="text-lg font-semibold mb-3">Schema preview</h3>
                        {nodes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No tables yet. Start in the editor.</p>
                        ) : (
                            <div className="space-y-3 max-h-[380px] overflow-auto pr-1">
                                {nodes.map((n) => (
                                    <div key={n.id} className="border rounded-md p-3">
                                        <div className="font-medium">{n.data.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{(n.data.fields ?? []).length} fields</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}