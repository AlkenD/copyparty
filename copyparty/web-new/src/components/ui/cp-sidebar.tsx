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

type MenuItem = {
  title: string
  url?: string
  isActive?: boolean
  items?: MenuItem[]
}

const items: MenuItem[] = [
  {
    title: 'Home',
    isActive: true,
    items: [
      {
        title: 'Documents',
        url: '/',
        items: [
          {
            title: 'PDFs',
            url: '/docs/pdfs',
          },
          {
            title: 'Word Docs',
            url: '/docs/word',
          },
        ],
      },
      {
        title: 'Images',
        url: '/',
      },
    ],
  },
]

const MenuItem = ({ item, isSubItem = false }: { item: MenuItem; isSubItem?: boolean }) => {
  if (item.items && item.items.length > 0) {
    const content = (
      <>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            <FileIcon className="mr-2" />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <MenuItem item={subItem} isSubItem={true} />
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </>
    )

    if (isSubItem) {
      return (
        <Collapsible
          defaultOpen={item.isActive}
          className="group/collapsible w-full"
        >
          {content}
        </Collapsible>
      )
    }

    return (
      <Collapsible
        asChild
        defaultOpen={item.isActive}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          {content}
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuButton asChild>
      <a href={item.url || '#'}>
        <FileIcon className="mr-2" />
        <span>{item.title}</span>
      </a>
    </SidebarMenuButton>
  )
}

const CpSidebar = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]! rounded-2xl p-4 pt-0"
      {...props}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <MenuItem key={item.title} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default CpSidebar
