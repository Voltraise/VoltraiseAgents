export interface InputLink {
  id: string
  source: string
  url: string
  description?: string
  createdAt?: Date
  metadata?: Record<string, any>
}

export interface InputLinkResult {
  success: boolean
  link?: InputLink
  error?: string
}

export class InputLinkHandler {
  private links = new Map<string, InputLink>()

  register(link: InputLink): InputLinkResult {
    if (!link.id || !link.url) {
      return { success: false, error: "Invalid link data: id and url are required." }
    }
    if (this.links.has(link.id)) {
      return { success: false, error: `Link with id "${link.id}" already exists.` }
    }
    this.links.set(link.id, { ...link, createdAt: link.createdAt || new Date() })
    return { success: true, link }
  }

  get(id: string): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    return { success: true, link }
  }

  list(): InputLink[] {
    return Array.from(this.links.values())
  }

  listBySource(source: string): InputLink[] {
    return Array.from(this.links.values()).filter(link => link.source === source)
  }

  update(id: string, updatedData: Partial<InputLink>): InputLinkResult {
    const existing = this.links.get(id)
    if (!existing) {
      return { success: false, error: `Cannot update: no link found for id "${id}".` }
    }
    const updatedLink = { ...existing, ...updatedData }
    this.links.set(id, updatedLink)
    return { success: true, link: updatedLink }
  }

  unregister(id: string): boolean {
    return this.links.delete(id)
  }

  clearAll(): void {
    this.links.clear()
  }

  count(): number {
    return this.links.size
  }
}
