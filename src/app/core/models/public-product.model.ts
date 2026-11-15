export interface PublicProduct {
  readonly source: 'http';
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly sku: string;
  readonly category: string;
  readonly brand: string;
  readonly price: number;
  readonly originalPrice: number | null;
  readonly stock: number | null;
  readonly availability: 'available' | 'unavailable' | 'unknown';
  readonly imageUrl: string | null;
  readonly images: readonly string[];
  readonly attributes: readonly { name: string; value: string }[];
  readonly averageRating?: number | null;
  readonly reviewCount?: number;
  readonly model?: string | null;
  readonly weight?: number | null;
  readonly dimensions?: string | null;
}
