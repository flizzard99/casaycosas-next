export type Producto = {
  id: number;
  name: string;
  description: string;
  category: string;
  image_url: string;
  instagram_url: string;
  visible: boolean;
  price: number;
  stock: number;
  images: string[];
  created_at: string;
};

export type ProductoInput = {
  name: string;
  description?: string;
  category: string;
  image_url?: string;
  instagram_url?: string;
  price?: number;
  stock?: number;
  images?: string[];
};

export type FeaturedConfig = {
  productIds: number[];
  title: string;
};

export type Config = {
  categoryOrder: string[];
  featured: FeaturedConfig;
};
