"use client"

import { useSession } from "@/components/AuthProvider"
import { TableNodeData } from "@/components/editor/nodes/types/Field"
import { MsSqlLogo, MysqlLogo, PostgresLogo, SqliteLogo } from "@/components/Logos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserButton } from "@/components/UserButton"
import { Edge, Node } from "@xyflow/react"
import {
    ArrowUpDown,
    CalendarClock,
    CalendarPlus,
    Database,
    Database as DatabaseIcon,
    Filter,
    Grid2X2 as Grid,
    Rows as List,
    Plus,
    Search,
    Trash2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"

const ProjectIcon = ({ type, className }: { type?: string | null, className?: string }) => {
    switch (type) {
        case 'PostgreSQL': return <PostgresLogo className={className} />;
        case 'MySQL': return <MysqlLogo className={className} />;
        case 'MariaDB': return <MysqlLogo className={className} />;
        case 'SQLite': return <SqliteLogo className={className} />;
        case 'SQL Server': return <MsSqlLogo className={className} />;
        default: return <Database className={className} />;
    }
};
interface ProjectUser {
    name?: string | null
    email?: string
}

interface Project {
    id: string
    name: string
    schema: {
        nodes: Node<TableNodeData>[]
        edges: Edge[]
        metadata?: { lastModified: string }
    }
    createdAt: string
    updatedAt?: string
    description?: string
    type?: "RELATIONAL" | "NOSQL" | string
    user?: ProjectUser
}

type SortOption = "updatedDesc" | "createdDesc" | "nameAsc"

async function createProject(name: string, description?: string, type?: string): Promise<Project> {
    const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            schema: { nodes: [], edges: [] },
            description: description || null,
            type: type || null
        }),
    })
    if (!response.ok) throw new Error("Failed to create project")
    return response.json()
}

export default function ProjectsPage() {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterType, setFilterType] = useState<"ALL" | "RELATIONAL" | "NOSQL">("ALL")
    const [sortBy, setSortBy] = useState<SortOption>("updatedDesc")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
    const [newProjectName, setNewProjectName] = useState("Untitled project")
    const [newProjectType, setNewProjectType] = useState<"MySQL" | "PostgreSQL" | "SQLite" | "SQL Server" | "">("")

    const { data: session, isPending: isSessionPending } = useSession()

    useEffect(() => {
        void fetchProjects()
    }, [])

    async function fetchProjects() {
        try {
            setLoading(true)
            const response = await fetch("/api/projects", { cache: "no-store" })
            if (!response.ok) throw new Error("Failed to fetch projects")
            const data = await response.json()
            setProjects(data)
        } catch (err) {
            setError("Failed to load projects. Please try again.")
            console.error(err)
            toast.error("Failed to load projects")
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateProject(customName?: string) {
        try {
            const projectName = (customName ?? newProjectName ?? "Untitled project").trim()
            const newProject = await createProject(
                projectName || `New Project ${new Date().toISOString()}`,
                undefined,
                newProjectType || undefined
            )
            await fetchProjects()
            setIsCreateOpen(false)
            // Reset form fields
            setNewProjectName("Untitled project")
            setNewProjectType("")
            toast.success("Project created")
            router.push(`/projects/${newProject.id}/editor`)
        } catch (err) {
            console.error("Failed to create project:", err)
            setError("Failed to create project. Please try again.")
            toast.error("Failed to create project")
        }
    }

    async function handleDeleteProject() {
        if (!projectToDelete) return
        try {
            const res = await fetch(`/api/projects/${projectToDelete.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Delete failed")
            await fetchProjects()
            toast.success("Project deleted")
        } catch (err) {
            console.error("Failed to delete project:", err)
            toast.error("Failed to delete project")
        } finally {
            setIsDeleteOpen(false)
            setProjectToDelete(null)
        }
    }

    const filteredAndSorted: Project[] = useMemo(() => {
        const filtered = projects.filter((project) => {
            const haystack = `${project.name} ${project.description ?? ""}`.toLowerCase()
            const q = searchTerm.toLowerCase().trim()
            const matchesSearch = q.length === 0 || haystack.includes(q)
            const matchesFilter = filterType === "ALL" || project.type === filterType
            return matchesSearch && matchesFilter
        })

        const toTime = (d?: string) => (d ? new Date(d).getTime() : 0)
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case "createdDesc":
                    return toTime(b.createdAt) - toTime(a.createdAt)
                case "nameAsc":
                    return a.name.localeCompare(b.name)
                case "updatedDesc":
                default:
                    return toTime(b.updatedAt ?? b.createdAt) - toTime(a.updatedAt ?? a.createdAt)
            }
        })
    }, [projects, searchTerm, filterType, sortBy])

    const getTypeBadgeVariant = (type?: string) => {
        switch (type) {
            case "RELATIONAL":
            case "MySQL":
            case "PostgreSQL":
            case "SQLite":
            case "SQL Server":
                return "secondary" as const
            case "NOSQL":
                return "outline" as const
            default:
                return "outline" as const
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A"
        try {
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            })
        } catch {
            return "Invalid Date"
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="rounded-xl border bg-card text-card-foreground overflow-hidden mb-6">
                    <div className="bg-gradient-to-b from-primary/10 via-accent to-transparent p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Projects</h1>
                                <p className="text-muted-foreground mt-1">Design, organize, and collaborate on your data models.</p>
                            </div>
                            {!session && !isSessionPending ? (
                                <Link href="/sign-in">
                                    <Button size="lg">Log in to create</Button>
                                </Link>
                            ) : session ? (
                                <div className="flex gap-2 items-center">
                                    <UserButton />
                                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="lg">
                                                <Plus /> New project
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Create a new project</DialogTitle>
                                                <DialogDescription>Give your project a clear, descriptive name and optional details.</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Project name *</label>
                                                    <Input
                                                        autoFocus
                                                        value={newProjectName}
                                                        onChange={(e) => setNewProjectName(e.target.value)}
                                                        placeholder="e.g. E‑commerce database"
                                                    />
                                                </div>
                                                <div className="space-y-3 pt-2">
                                                    <label className="text-sm font-medium">Database</label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {[
                                                            { id: 'MySQL', label: 'MySQL', Icon: MysqlLogo },
                                                            { id: 'PostgreSQL', label: 'PostgreSQL', Icon: PostgresLogo },
                                                            { id: 'SQLite', label: 'SQLite', Icon: SqliteLogo },
                                                            { id: 'SQL Server', label: 'SQL Server', Icon: MsSqlLogo },
                                                        ].map((db) => (
                                                            <button
                                                                key={db.id}
                                                                onClick={() => setNewProjectType(db.id as any)}
                                                                className={`flex flex-col items-center justify-center p-4 border rounded-xl hover:bg-accent/50 transition-colors ${newProjectType === db.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                                                            >
                                                                <db.Icon className="w-10 h-10 mb-2" />
                                                                <span className="text-[11px] font-medium">{db.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => {
                                                    setIsCreateOpen(false)
                                                    // Reset form fields
                                                    setNewProjectName("Untitled project")
                                                    setNewProjectType("")
                                                }}>Cancel</Button>
                                                <Button onClick={() => void handleCreateProject()}>Create</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ) : (
                                <Skeleton className="h-10 w-32" />
                            )}
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 border-t">
                        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="relative w-full sm:max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                                    <Input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search projects..."
                                        className="pl-9"
                                        aria-label="Search projects"
                                    />
                                </div>
                                <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                                    <SelectTrigger aria-label="Filter by project type" className="w-[140px]">
                                        <DatabaseIcon className="mr-2 h-4 w-4" />
                                        <SelectValue>
                                            {filterType === "ALL" ? "All types" :
                                                filterType === "RELATIONAL" ? "Relational" :
                                                    filterType === "NOSQL" ? "NoSQL" : "Type"}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All types</SelectItem>
                                        <SelectItem value="RELATIONAL">Relational</SelectItem>
                                        <SelectItem value="NOSQL">NoSQL</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                                    <SelectTrigger aria-label="Sort projects" className="w-[160px]">
                                        <ArrowUpDown className="mr-2 h-4 w-4" />
                                        <SelectValue>
                                            {sortBy === "updatedDesc" ? "Recently updated" :
                                                sortBy === "createdDesc" ? "Recently created" :
                                                    sortBy === "nameAsc" ? "Name A→Z" : "Sort by"}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="updatedDesc">Recently updated</SelectItem>
                                        <SelectItem value="createdDesc">Recently created</SelectItem>
                                        <SelectItem value="nameAsc">Name A→Z</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                                <TabsList>
                                    <TabsTrigger value="grid" className="w-24"><Grid className="mr-1" /> Grid</TabsTrigger>
                                    <TabsTrigger value="list" className="w-24"><List className="mr-1" /> List</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-xl border p-6 bg-card">
                                <Skeleton className="h-5 w-1/2 mb-4" />
                                <Skeleton className="h-3 w-1/3 mb-6" />
                                <div className="grid grid-cols-2 gap-3">
                                    <Skeleton className="h-10" />
                                    <Skeleton className="h-10" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-lg border p-6 text-destructive">{error}</div>
                ) : filteredAndSorted.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mx-auto mb-4 size-14 text-muted-foreground">
                            <Filter className="size-14 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium">No projects found</h3>
                        <p className="text-muted-foreground mt-1">
                            {searchTerm ? "Try adjusting your search terms." : "Create your first project to get started."}
                        </p>
                        <div className="mt-6">
                            <Button onClick={() => setIsCreateOpen(true)}>
                                <Plus className="mr-1" /> Create project
                            </Button>
                        </div>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAndSorted.map((project) => (
                            <div
                                key={project.id}
                                className="group rounded-xl border bg-card hover:shadow-md transition-all overflow-hidden"
                            >
                                <div />
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold truncate text-lg">
                                                {project.name}
                                            </h3>
                                        </div>
                                        {project.type && (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className="shrink-0 flex items-center justify-center p-1 transition-opacity hover:opacity-80 cursor">
                                                        <ProjectIcon type={project.type} className="w-7 h-7" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {project.type}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                    {project.description && (
                                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                                            {project.description}
                                        </p>
                                    )}
                                    <div className="grid grid-cols-3 gap-3 mt-6 text-sm">
                                        <div className="rounded-md border p-2.5">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                <Database className="size-4" /> Tables
                                            </div>
                                            <div className="font-medium">{project.schema?.nodes?.length ?? 0}</div>
                                        </div>
                                        <div className="rounded-md border p-2.5">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                <CalendarClock className="size-4" /> Updated
                                            </div>
                                            <div className="font-medium">{formatDate(project.updatedAt ?? project.createdAt)}</div>
                                        </div>
                                        <div className="rounded-md border p-2.5">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                <CalendarPlus className="size-4" /> Created
                                            </div>
                                            <div className="font-medium">{formatDate(project.createdAt)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex gap-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link href={`/projects/${project.id}`} className="w-full">
                                                    <Button variant="outline" className="w-full">View details</Button>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent>Open project overview</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link href={`/projects/${project.id}/editor`} className="w-full">
                                                    <Button className="w-full">Open editor</Button>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent>Start modeling</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="destructive"
                                                    size="lg"
                                                    onClick={() => {
                                                        setProjectToDelete(project)
                                                        setIsDeleteOpen(true)
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete project</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y rounded-xl border bg-card overflow-hidden">
                        {filteredAndSorted.map((project) => (
                            <div key={project.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium truncate">{project.name}</h3>
                                        {project.type && (
                                            <Badge variant={getTypeBadgeVariant(project.type)}>{project.type}</Badge>
                                        )}
                                    </div>
                                    {project.description && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{project.description}</p>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                                        <span>Updated {formatDate(project.updatedAt ?? project.createdAt)}</span>
                                        <span>Created {formatDate(project.createdAt)}</span>
                                        <span>{project.schema?.nodes?.length ?? 0} tables</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    {project.type && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <div className="flex items-center justify-center p-1 transition-opacity hover:opacity-80 cursor-help">
                                                    <ProjectIcon type={project.type} className="w-7 h-7" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {project.type} Database
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    <div className="flex gap-2">
                                        <Link href={`/projects/${project.id}`}>
                                            <Button variant="outline">View</Button>
                                        </Link>
                                        <Link href={`/projects/${project.id}/editor`}>
                                            <Button>Edit</Button>
                                        </Link>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                setProjectToDelete(project)
                                                setIsDeleteOpen(true)
                                            }}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete project</DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. This will permanently delete {projectToDelete?.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => void handleDeleteProject()}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
