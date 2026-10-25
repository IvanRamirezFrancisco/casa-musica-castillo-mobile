/** PublicCategoryDTO.java y Category.java del backend: sin envoltorio ni paginación. */
export interface PublicCategory {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly parentId: number | null;
  readonly parentName: string | null;
  readonly activeProductCount: number;
}

export function isPublicCategory(value: unknown): value is PublicCategory {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  const nullableString = (item: unknown): boolean => item === null || typeof item === 'string';
  return typeof row['id'] === 'number' && Number.isSafeInteger(row['id'])
    && typeof row['name'] === 'string'
    && nullableString(row['description'])
    && nullableString(row['imageUrl'])
    && (row['parentId'] === null || (typeof row['parentId'] === 'number' && Number.isSafeInteger(row['parentId'])))
    && nullableString(row['parentName'])
    && typeof row['activeProductCount'] === 'number' && Number.isInteger(row['activeProductCount']);
}
