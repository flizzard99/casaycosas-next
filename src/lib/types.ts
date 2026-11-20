export type Variante = { id: string; color: string; stock: number };

export type Producto = {
  id: number;
  name: string;
  description: string;
  category: string;
  image_url: string;
  instagram_url: string;
  visible: boolean;
  remate: boolean;
  price: number;
  precioOferta: number | null;
  variantes: Variante[];
  stock: number;
  images: string[];
    created_at: string;
    updated_at?: string;
};

export type ProductoInput = {
  name: string;
  description?: string;
  category: string;
  image_url?: string;
  instagram_url?: string;
  price?: number;
  precioOferta?: number | null;
  variantes?: Variante[];
  version?: string;
  stock?: number;
  images?: string[];
};

export type FeaturedConfig = {
  productIds: number[];
  title: string;
};

export type DisenoSeccion = { imagen?: string; fondo?: string; titulo?: string; descripcion?: string };

export type Config = {
  categoryOrder: string[];
  featured: FeaturedConfig;
  diseno: Partial<Record<'matera' | 'cristiana' | 'remate', DisenoSeccion>>;
};
