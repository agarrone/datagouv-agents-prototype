import type { ResourceContext } from "../../shared/schemas/agent";

export interface CatalogAdapter {
  getResource(resourceId: string): Promise<ResourceContext>;
}

