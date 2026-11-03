export interface PublicProductDto {
  readonly id: number;
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly detailedDescription: string | null;
  readonly price: number;
  readonly discountPrice: number | null;
  readonly stock: number | null;
  readonly imageUrl: string | null;
  readonly images: readonly { url: string; displayOrder: number | null }[];
  readonly category: { id: number; name: string; parentId: number | null; parentName: string | null } | null;
  readonly brand: { id: number; name: string; logoUrl: string | null } | null;
  readonly attributes: readonly { name: string; value: string; displayOrder: number | null }[];
  readonly model: string | null;
  readonly weight: number | null;
  readonly dimensions: string | null;
  readonly featured: boolean;
  readonly averageRating: number | null;
  readonly reviewCount: number;
}

export interface PublicPage<T> {
  readonly content: readonly T[];
  readonly number: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
}
export type PublicSort = 'featured' | 'price_asc' | 'price_desc' | 'name_asc';
export interface CatalogQuery {
  readonly keyword?: string;
  readonly categoryId?: number;
  readonly page?: number;
  readonly size?: number;
  readonly sortBy?: PublicSort;
}
