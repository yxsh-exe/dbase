import { Button } from "@/components/ui/button";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, Check, Code2, Database, DownloadCloud, GitBranch, Network, Shapes, Shield, Users, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden">
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_60rem_at_50%_-10%,_oklch(0.2_0_0/_0.9),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40rem_40rem_at_120%_20%,_oklch(0.35_0.08_260/_0.3),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40rem_40rem_at_-20%_80%,_oklch(0.35_0.08_20/_0.25),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.08] [mask-image:radial-gradient(50%_50%_at_50%_50%,_black,transparent)]" style={{ backgroundImage: "linear-gradient(to_right,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.12)_1px,transparent_1px)", backgroundSize: "32px 32px" }} />
      </div>

      {/* Nav */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          {/* <div className="size-8 rounded-md bg-primary/20 ring-1 ring-primary/30" /> */}
          <span className="text-2xl font-bold tracking-wide ">DBase</span>
        </Link>
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">Log in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="gap-1">
                Get started
                <ArrowRight className="size-4" />
              </Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/projects">
              <Button size="sm" className="gap-1">
                Open app
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "size-8" } }} />
          </Show>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-10 md:pt-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          Visual data modeling for modern teams
        </div>
        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          Design database schemas visually. Export with confidence.
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Drag-and-drop tables, define relationships, and generate SQL instantly. Collaborate and iterate without getting lost in migration scripts.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/projects">
            <Button className="h-11 px-6">Open DBase</Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" className="h-11 px-6">Learn more</Button>
          </Link>
        </div>

        {/* Mock preview */}
        <div className="mt-14 w-full">
          <div className="mx-auto w-full overflow-hidden rounded-xl border border-border bg-card/50 shadow-2xl ring-1 ring-black/5 backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
              <div className="size-3 rounded-full bg-red-500/80" />
              <div className="size-3 rounded-full bg-yellow-500/80" />
              <div className="size-3 rounded-full bg-green-500/80" />
            </div>

            {/* Content */}
            <div className="flex items-center justify-center p-5">
              <Image
                src="/landing.png"
                alt="Landing Image"
                width={1000}
                height={1000}
                className="rounded-lg object-contain"
              />
            </div>

          </div>
        </div>

      </section>
      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Feature icon={<Network className="size-5" />} title="Visual relations" description="Define one-to-one, one-to-many, and many-to-many with interactive linking." />
          <Feature icon={<Shapes className="size-5" />} title="Rich field types" description="Choose from common SQL types with sensible defaults and constraints." />
          <Feature icon={<DownloadCloud className="size-5" />} title="Export ready" description="Generate SQL from your model and bring it straight to your database." />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-10">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Step number={1} title="Create tables" description="Add tables and fields with sensible defaults, constraints, and types." />
          <Step number={2} title="Link relations" description="Connect tables with relations and visualize cardinality instantly." />
          <Step number={3} title="Export SQL" description="Convert your schema to SQL and use it directly in your database." />
        </div>
      </section>

      {/* Advanced Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold md:text-3xl">Built for scale and collaboration</h2>
          <p className="mt-2 text-muted-foreground">Enterprise-grade features that grow with your team</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AdvancedFeature
            icon={<Database className="size-5" />}
            title="Multi-database support"
            description="PostgreSQL, MySQL, SQLite - export to any database with optimized schemas."
          />
          <AdvancedFeature
            icon={<GitBranch className="size-5" />}
            title="Version control"
            description="Track schema changes with built-in versioning and rollback capabilities."
          />
          <AdvancedFeature
            icon={<Users className="size-5" />}
            title="Real-time collaboration"
            description="Work together with live cursors, comments, and instant synchronization."
          />
          <AdvancedFeature
            icon={<Shield className="size-5" />}
            title="Enterprise security"
            description="SOC2 compliant with SSO, role-based access, and audit logs."
          />
          <AdvancedFeature
            icon={<Code2 className="size-5" />}
            title="API integration"
            description="Programmatic access to your schemas with REST and GraphQL APIs."
          />
          <AdvancedFeature
            icon={<Zap className="size-5" />}
            title="Lightning fast"
            description="Sub-second loading with intelligent caching and edge distribution."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24 text-center">
        <div className="rounded-2xl border border-border bg-card/40 px-6 py-10 md:px-10 md:py-14">
          <h2 className="text-balance text-2xl font-semibold md:text-3xl">Start modeling in minutes</h2>
          <p className="mt-2 text-muted-foreground">No setup required. Create your first project and design together.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/projects">
              <Button className="h-11 px-6">
                Create project
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" className="h-11 px-6">See features</Button>
            </Link>
          </div>
          <ul className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1"><Check className="size-3" /> No credit card</li>
            <li className="inline-flex items-center gap-1"><Check className="size-3" /> Fast & lightweight</li>
            <li className="inline-flex items-center gap-1"><Check className="size-3" /> Open export</li>
          </ul>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-7xl px-6 pb-10">
        <div className="flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} DBase</span>
          <span>Built with Next.js</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="inline-flex items-center justify-center rounded-md border border-border bg-background/40 p-2 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/30">
        {number}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AdvancedFeature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-xl border border-border bg-card/40 p-5 transition-all hover:bg-card/60 hover:shadow-md">
      <div className="inline-flex items-center justify-center rounded-md border border-border bg-background/40 p-2 text-primary group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}