-- Create products table for synced e-commerce products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  handle TEXT,
  product_url TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  stock_quantity INTEGER,
  stock_status TEXT DEFAULT 'in_stock',
  variants JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT unique_product_per_integration UNIQUE(website_id, integration_id, external_id)
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create indexes for fast lookups
CREATE INDEX idx_products_website ON public.products(website_id);
CREATE INDEX idx_products_integration ON public.products(integration_id);
CREATE INDEX idx_products_stock ON public.products(stock_status);
CREATE INDEX idx_products_active ON public.products(is_active) WHERE is_active = true;

-- RLS Policies
CREATE POLICY "Users can view products for their websites"
ON public.products FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.websites w
  WHERE w.id = products.website_id AND w.user_id = auth.uid()
));

CREATE POLICY "Users can insert products for their websites"
ON public.products FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.websites w
  WHERE w.id = products.website_id AND w.user_id = auth.uid()
));

CREATE POLICY "Users can update products for their websites"
ON public.products FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.websites w
  WHERE w.id = products.website_id AND w.user_id = auth.uid()
));

CREATE POLICY "Users can delete products for their websites"
ON public.products FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.websites w
  WHERE w.id = products.website_id AND w.user_id = auth.uid()
));

-- Admins can view all products
CREATE POLICY "Admins can view all products"
ON public.products FOR SELECT
USING (has_role(auth.uid(), 'admin'::text));

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();