// Sprint 5 — PROOF-02 Product section.
// Renders only when proof_product_items exist for this proof, OR when the
// user manually adds one. Gated higher up via `has_product_enrichment`,
// but this component is also safe to mount unconditionally — it self-hides
// when there's nothing to show and the user isn't allowed to add items.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

const db = supabase as any;

interface ProofProductItem {
  id: string;
  proof_object_id: string;
  business_id: string;
  is_primary: boolean;
  product_id_external: string;
  variant_id_external: string | null;
  product_name: string;
  variant_label: string | null;
  product_url: string | null;
  product_image_url: string | null;
  product_image_cached: string | null;
  product_images_all: string[] | null;
  product_category: string | null;
  product_price: number | null;
  currency: string | null;
  quantity: number;
  source_platform: string;
  image_fetch_status: string;
  retry_count: number;
  created_at: string;
}

interface ScrapedProduct {
  url: string;
  canonical_url?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  price?: string | null;
  currency?: string | null;
  brand?: string | null;
  site_name?: string | null;
}

interface Props {
  proofId: string;
  businessId: string;
  canEdit: boolean;
}

export function ProofProductSection({ proofId, businessId, canEdit }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProofProductItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("proof_product_items")
      .select("*")
      .eq("proof_object_id", proofId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Couldn't load products", description: error.message, variant: "destructive" });
      setItems([]);
    } else {
      setItems((data ?? []) as ProofProductItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proofId]);

  const onAdded = () => {
    setAddOpen(false);
    load();
  };

  // Hide entirely when there's no data AND the user can't add anything.
  if (!loading && items.length === 0 && !canEdit) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Product
          {items.length > 1 && (
            <Badge variant="secondary" className="text-[10px]">
              {items.length} items
            </Badge>
          )}
        </CardTitle>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add product
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No product linked yet. Add the product page URL to enrich this proof with a name and image.
          </p>
        ) : (
          items.map((item) => (
            <ProductItemRow
              key={item.id}
              item={item}
              canEdit={canEdit}
              onChanged={load}
            />
          ))
        )}
      </CardContent>

      <AddProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        proofId={proofId}
        businessId={businessId}
        isFirst={items.length === 0}
        onAdded={onAdded}
      />
    </Card>
  );
}

function ProductItemRow({
  item,
  canEdit,
  onChanged,
}: {
  item: ProofProductItem;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const image = item.product_image_cached || item.product_image_url || null;
  const priceLabel = formatPrice(item.product_price, item.currency);

  const copyBuyLink = async () => {
    if (!item.product_url) return;
    try {
      await navigator.clipboard.writeText(item.product_url);
      toast({ title: "Buy link copied" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await db.from("proof_product_items").delete().eq("id", item.id);
    setBusy(false);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Product removed" });
    onChanged();
  };

  return (
    <div className="flex gap-3 rounded-md border bg-card p-3">
      <div className="h-20 w-20 flex-shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={item.product_name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{item.product_name}</span>
              {item.is_primary && (
                <Badge variant="default" className="text-[10px] gap-1">
                  <Star className="h-2.5 w-2.5" /> Primary
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
              {item.variant_label && <span>{item.variant_label}</span>}
              {item.product_category && <span>· {item.product_category}</span>}
              <span className="capitalize">· {item.source_platform}</span>
            </div>
          </div>
          {priceLabel && (
            <div className="text-sm font-semibold whitespace-nowrap">{priceLabel}</div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap pt-1">
          {item.image_fetch_status === "pending" && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Caching image…
            </Badge>
          )}
          {item.image_fetch_status === "failed" && (
            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
              Image fetch failed
            </Badge>
          )}
          {item.product_url && (
            <Button size="sm" variant="ghost" asChild>
              <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> View product
              </a>
            </Button>
          )}
          {item.product_url && (
            <Button size="sm" variant="ghost" onClick={copyBuyLink}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy buy link
            </Button>
          )}
          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  className="text-destructive hover:text-destructive ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this product?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The proof itself stays intact. Only the linked product card is removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={remove}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}

function AddProductDialog({
  open,
  onOpenChange,
  proofId,
  businessId,
  isFirst,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proofId: string;
  businessId: string;
  isFirst: boolean;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scraped, setScraped] = useState<ScrapedProduct | null>(null);
  const [overrideName, setOverrideName] = useState("");

  const reset = () => {
    setUrl("");
    setScraped(null);
    setOverrideName("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const scrape = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setScraping(true);
    setScraped(null);
    const { data, error } = await supabase.functions.invoke("fetch-product-from-url", {
      body: { url: trimmed },
    });
    setScraping(false);

    if (error) {
      toast({
        title: "Couldn't fetch product",
        description: error.message ?? "Try a different URL.",
        variant: "destructive",
      });
      return;
    }
    const product = (data as any)?.product as ScrapedProduct | undefined;
    if (!product) {
      toast({
        title: "No product metadata found",
        description: "The page didn't expose Open Graph or JSON-LD product info.",
        variant: "destructive",
      });
      return;
    }
    setScraped(product);
    setOverrideName(product.name ?? "");
  };

  const save = async () => {
    if (!scraped) return;
    const finalName = overrideName.trim() || scraped.name?.trim() || "Untitled product";
    setSaving(true);

    const priceNum =
      scraped.price && !Number.isNaN(Number(scraped.price))
        ? Number(scraped.price)
        : null;

    // product_id_external is required + not null. Synthesise a stable id from
    // the URL when the source has none of its own.
    const externalId = `manual:${(scraped.canonical_url ?? scraped.url ?? url).slice(0, 200)}`;

    const { error } = await db.from("proof_product_items").insert({
      proof_object_id: proofId,
      business_id: businessId,
      is_primary: isFirst,
      product_id_external: externalId,
      product_name: finalName.slice(0, 500),
      product_url: scraped.canonical_url ?? scraped.url ?? url.trim(),
      product_image_url: scraped.image_url ?? null,
      product_images_all: scraped.image_url ? [scraped.image_url] : [],
      product_category: null,
      product_price: priceNum,
      currency: scraped.currency ?? null,
      quantity: 1,
      source_platform: "manual",
      raw_product_payload: { scraped },
    });
    setSaving(false);
    if (error) {
      return toast({ title: "Couldn't save product", description: error.message, variant: "destructive" });
    }
    toast({ title: "Product linked" });
    reset();
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a product</DialogTitle>
          <DialogDescription>
            Paste the product page URL — we'll pull the name, image and price automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="prod-url">Product page URL</Label>
            <div className="flex gap-2">
              <Input
                id="prod-url"
                type="url"
                placeholder="https://example.com/products/widget"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button type="button" onClick={scrape} disabled={scraping || !url.trim()}>
                {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
              </Button>
            </div>
          </div>

          {scraped && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-3">
              <div className="flex gap-3">
                <div className="h-20 w-20 flex-shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden">
                  {scraped.image_url ? (
                    <img
                      src={scraped.image_url}
                      alt={scraped.name ?? "Product"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-sm font-medium truncate">{scraped.name ?? "(no name found)"}</div>
                  {scraped.site_name && (
                    <div className="text-xs text-muted-foreground truncate">{scraped.site_name}</div>
                  )}
                  {formatPrice(
                    scraped.price ? Number(scraped.price) : null,
                    scraped.currency ?? null,
                  ) && (
                    <div className="text-sm font-semibold">
                      {formatPrice(scraped.price ? Number(scraped.price) : null, scraped.currency ?? null)}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-name">Product name (editable)</Label>
                <Input
                  id="prod-name"
                  value={overrideName}
                  onChange={(e) => setOverrideName(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!scraped || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Link product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPrice(price: number | null, currency: string | null): string | null {
  if (price == null || Number.isNaN(price)) return null;
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
    } catch {
      return `${price.toFixed(2)} ${currency}`;
    }
  }
  return price.toFixed(2);
}
