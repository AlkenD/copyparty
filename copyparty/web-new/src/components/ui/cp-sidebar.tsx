import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '../shadcn/sidebar'
import { ChevronRight, FileIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../shadcn/collapsible'
import * as React from 'react'
import { CopypartyClient } from '../../lib'

type Node = {
  title: string
  href?: string // navigation target for files/dirs
  vpath: string // virtual path to fetch when expanding
  isDir: boolean
  children?: Node[]
  loaded?: boolean
}

function nameFromHref(href: string): string {
  const noQuery = href.split('?')[0]
  const parts = noQuery.split('/').filter(Boolean)
  return decodeURIComponent(parts[parts.length - 1] || '')
}

function normalizeVpath(parent: string, child: string, isDir: boolean): string {
  const p = parent.endsWith('/') ? parent.slice(0, -1) : parent
  const vp = `${p}/${child}`
  return isDir ? `${vp}/` : vp
}

const client = new CopypartyClient(import.meta.env.DEV ? '/api' : '/')

async function fetchNodes(vpath: string): Promise<Node[]> {
  // Basic retry with exponential backoff for transient server errors
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ls = await client.list(vpath, { dots: false })
      const base = vpath.endsWith('/') ? vpath : `${vpath}/`
      const dirs: Node[] = (ls.dirs || []).map((d) => {
        const title = nameFromHref(d.href)
        return {
          title,
          href: d.href.startsWith('/') ? d.href : `/${d.href}`,
          vpath: normalizeVpath(base, title, true),
          isDir: true,
          children: [],
          loaded: false,
        }
      })
      const files: Node[] = (ls.files || []).map((f) => {
        const title = nameFromHref(f.href)
        return {
          title,
          href: f.href.startsWith('/') ? f.href : `/${f.href}`,
          vpath: normalizeVpath(base, title, false),
          isDir: false,
        }
      })
      return [...dirs, ...files]
    } catch (e) {
      lastErr = e
      // small backoff: 300ms, 600ms
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

const RenderNode: React.FC<{ node: Node; depth?: number; onLoadChildren: (n: Node) => Promise<void> }> = ({ node, depth = 0, onLoadChildren }) => {
  if (!node.isDir) {
    return (
      <SidebarMenuButton asChild>
        <a href={node.href || '#'}>
          <FileIcon className="mr-2" />
          <span>{node.title}</span>
        </a>
      </SidebarMenuButton>
    )
  }

  const content = (
    <>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton tooltip={node.title}>
          <FileIcon className="mr-2" />
          <span>{node.title}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {(node.children || []).map((child) => (
            <SidebarMenuSubItem key={`${node.vpath}-${child.title}`}>
              <RenderNode node={child} depth={depth + 1} onLoadChildren={onLoadChildren} />
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </>
  )

  // For sub-items, Collapsible without asChild to preserve layout
  if (depth > 0) {
    return (
      <Collapsible
        defaultOpen={false}
        className="group/collapsible w-full"
        onOpenChange={async (open) => {
          if (open && node.isDir && !node.loaded) await onLoadChildren(node)
        }}
      >
        {content}
      </Collapsible>
    )
  }

  return (
    <Collapsible
      asChild
      defaultOpen={false}
      className="group/collapsible"
      onOpenChange={async (open) => {
        if (open && node.isDir && !node.loaded) await onLoadChildren(node)
      }}
    >
      <SidebarMenuItem>{content}</SidebarMenuItem>
    </Collapsible>
  )
}

const CpSidebar = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  const [roots, setRoots] = React.useState<Node[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchNodes('/')
      setRoots(data)
    } catch (e) {
      setRoots([])
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const loadChildren = React.useCallback(async (n: Node) => {
    const children = await fetchNodes(n.vpath)
    setRoots((prev) => {
      const replace = (nodes: Node[]): Node[] =>
        nodes.map((x) =>
          x === n
            ? { ...x, children, loaded: true }
            : x.isDir && x.children
            ? { ...x, children: replace(x.children) }
            : x,
        )
      return replace(prev)
    })
  }, [])

  console.log(roots)

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]! rounded-2xl p-4 pt-0"
      {...props}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Files
            {loading ? (
              <span className="ml-2 text-xs opacity-60">loading…</span>
            ) : (
              <button className="ml-2 text-xs underline opacity-60 hover:opacity-100" onClick={refresh}>
                refresh
              </button>
            )}
          </SidebarGroupLabel>
          <SidebarMenu>
            {error && (
              <SidebarMenuItem>
                <div className="text-xs text-red-500">
                  {error}
                </div>
              </SidebarMenuItem>
            )}
            {roots.map((n) => (
              <RenderNode key={`root-${n.title}`} node={n} onLoadChildren={loadChildren} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default CpSidebar
