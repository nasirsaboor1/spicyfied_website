import { AdminProduct, AdminCategory } from './adminProducts';

export async function exportProductsToExcel(
  products: AdminProduct[],
  categories: AdminCategory[]
): Promise<void> {
  // Loaded on demand so the ~300KB xlsx library never ships in the main bundle
  // that every storefront visitor downloads - only admins who click this button.
  const XLSX = await import('xlsx');
  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name || 'Uncategorised';

  const overviewRows = products.map((p) => {
    const totalStock = p.product_variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
    const totalValue = p.product_variants.reduce(
      (sum, v) => sum + (v.stock_quantity || 0) * v.price,
      0
    );
    return {
      'Product Name': p.name,
      SKU: p.sku,
      Category: categoryName(p.category_id),
      Status: p.is_active ? 'Active' : 'Hidden',
      'Stock Status': p.stock_status,
      Featured: p.is_featured ? 'Yes' : 'No',
      'New Arrival': p.is_new_arrival ? 'Yes' : 'No',
      'Base Price (Rs)': p.base_price,
      Variants: p.product_variants.length,
      'Total Units in Stock': totalStock,
      'Stock Value (Rs)': Math.round(totalValue),
      'Has Photo': p.product_images.length > 0 ? 'Yes' : 'No',
    };
  });

  const variantRows = products.flatMap((p) =>
    p.product_variants.map((v) => ({
      'Product Name': p.name,
      'Product SKU': p.sku,
      Category: categoryName(p.category_id),
      Size: v.variant_name,
      'Variant SKU': v.sku,
      'Price (Rs)': v.price,
      'Compare-at Price (Rs)': v.compare_at_price ?? '',
      'Stock Quantity': v.stock_quantity,
      'Stock Value (Rs)': Math.round((v.stock_quantity || 0) * v.price),
      Default: v.is_default ? 'Yes' : 'No',
    }))
  );

  const overviewSheet = XLSX.utils.json_to_sheet(overviewRows);
  overviewSheet['!cols'] = [
    { wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
    { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 18 },
    { wch: 14 }, { wch: 10 },
  ];

  const variantsSheet = XLSX.utils.json_to_sheet(variantRows);
  variantsSheet['!cols'] = [
    { wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 16 },
    { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, overviewSheet, 'Products Overview');
  XLSX.utils.book_append_sheet(wb, variantsSheet, 'Variant Stock Detail');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `spicyfied-inventory-${dateStr}.xlsx`);
}
