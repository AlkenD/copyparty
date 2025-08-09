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
import { ChevronRight, FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../shadcn/collapsible'
import * as React from 'react'
import { client } from '../../lib'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type Node = {
  title: string
  href?: string
  vpath: string
  isDir: boolean
  children?: Node[]
  loaded?: boolean
}

const fetchNodes = (vpath: string): Promise<Node[]> => client.listNodes(vpath, { dots: false }) as Promise<Node[]>

const RenderNode: React.FC<{ node: Node; depth?: number }> = ({ node, depth = 0 }) => {
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

  const [open, setOpen] = React.useState(false)

  const content = (
    <>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton tooltip={node.title}>
          {open ? (
            <FolderOpenIcon className="mr-2" />
          ) : (
            <FolderIcon className="mr-2" />
          )}
          <span>{node.title}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          <NodeChildren parent={node} depth={depth + 1} />
        </SidebarMenuSub>
      </CollapsibleContent>
    </>
  )

  if (depth > 0) {
    return (
      <Collapsible
        open={open}
        className="group/collapsible w-full"
        onOpenChange={setOpen}
      >
        {content}
      </Collapsible>
    )
  }

  return (
    <Collapsible
      asChild
      open={open}
      className="group/collapsible"
      onOpenChange={setOpen}
    >
      <SidebarMenuItem>{content}</SidebarMenuItem>
    </Collapsible>
  )
}

const CpSidebar = ({ className, ...props }: React.ComponentProps<typeof Sidebar>) => {
  const qc = useQueryClient()
  const {
    data: roots = [],
    isFetching: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['nodes', '/'],
    queryFn: () => fetchNodes('/'),
    retry: 2,
    staleTime: 15_000,
  })

  return (
    <Sidebar
      collapsible="none"
      variant="inset"
      className={`h-full w-full rounded-2xl ${className ?? ''}`}
      {...props}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Files
            {loading ? (
              <span className="ml-2 text-xs opacity-60">loading…</span>
            ) : (
              <button
                className="ml-2 text-xs underline opacity-60 hover:opacity-100"
                onClick={() => {
                  qc.invalidateQueries({ queryKey: ['nodes'] })
                  void refetch()
                }}
              >
                refresh
              </button>
            )}
          </SidebarGroupLabel>
          <SidebarMenu>
            {error && (
              <SidebarMenuItem>
                <div className="text-xs text-red-500">
                  {error instanceof Error ? error.message : String(error)}
                </div>
              </SidebarMenuItem>
            )}
            {roots.map((n: Node) => (
              <RenderNode key={`root-${n.title}`} node={n} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

const NodeChildren: React.FC<{ parent: Node; depth: number }> = ({ parent, depth }) => {
  const { data: children = [], isFetching, error } = useQuery({
    queryKey: ['nodes', parent.vpath],
    queryFn: () => fetchNodes(parent.vpath),
    retry: 2,
    staleTime: 30_000,
  })

  if (error) {
    return (
      <SidebarMenuSubItem>
        <div className="text-xs text-red-500">
          {error instanceof Error ? error.message : String(error)}
        </div>
      </SidebarMenuSubItem>
    )
  }

  if (isFetching && children.length === 0) {
    return (
      <SidebarMenuSubItem>
        <div className="text-xs opacity-60">loading…</div>
      </SidebarMenuSubItem>
    )
  }

  return (
    <>
      {children.map((child: Node) => (
        <SidebarMenuSubItem key={`${parent.vpath}-${child.title}`}>
          <RenderNode node={child} depth={depth} />
        </SidebarMenuSubItem>
      ))}
    </>
  )
}

export default CpSidebar
