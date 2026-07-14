const DOLIBARR_API_URL = process.env.DOLIBARR_API_URL;
const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;

export type DolibarrProduct = {
  id: number;
  ref: string;
  ref_ext: string | null;
  label: string;
  stock_reel: number;
  status: number;
};

type DolibarrPagination = {
  total: number;
  page: number;
  page_count: number;
  limit: number;
};

export type DolibarrProductPage = {
  data: DolibarrProduct[];
  pagination: DolibarrPagination;
};

function headers(): Record<string, string> {
  if (!DOLIBARR_API_KEY) throw new Error('DOLIBARR_API_KEY no configurada');
  return {
    DOLAPIKEY: DOLIBARR_API_KEY,
    'Content-Type': 'application/json'
  };
}

function baseUrl(): string {
  if (!DOLIBARR_API_URL) throw new Error('DOLIBARR_API_URL no configurada');
  return DOLIBARR_API_URL.replace(/\/+$/, '');
}

export async function fetchProductoStock(productId: number): Promise<DolibarrProduct | null> {
  const url = `${baseUrl()}/api/index.php/products/${productId}?includestockdata=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchProductosConStock(page = 0, limit = 100): Promise<DolibarrProductPage> {
  const url = `${baseUrl()}/api/index.php/products?includestockdata=1&pagination_data=true&mode=1&limit=${limit}&page=${page}&sortfield=t.rowid&sortorder=ASC`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Dolibarr API error: ${res.status}`);
  return res.json();
}

export async function fetchAllProductosConStock(): Promise<DolibarrProduct[]> {
  const all: DolibarrProduct[] = [];
  let page = 0;
  while (true) {
    const { data, pagination } = await fetchProductosConStock(page);
    all.push(...data);
    page++;
    if (page >= pagination.page_count) break;
  }
  return all;
}
