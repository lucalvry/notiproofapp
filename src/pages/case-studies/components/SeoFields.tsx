import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SeoFields({
  title, slug, metaTitle, metaDescription,
  onChange,
}: {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  onChange: (patch: Partial<{ title: string; slug: string; metaTitle: string; metaDescription: string }>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => onChange({ title: e.target.value })} maxLength={200} />
      </div>
      <div>
        <Label>Slug</Label>
        <Input value={slug} onChange={(e) => onChange({ slug: e.target.value })} maxLength={120} />
      </div>
      <div>
        <Label>Meta title <span className="text-xs text-muted-foreground">({metaTitle.length}/60)</span></Label>
        <Input value={metaTitle} onChange={(e) => onChange({ metaTitle: e.target.value.slice(0, 60) })} maxLength={60} />
      </div>
      <div>
        <Label>Meta description <span className="text-xs text-muted-foreground">({metaDescription.length}/160)</span></Label>
        <Textarea
          value={metaDescription}
          onChange={(e) => onChange({ metaDescription: e.target.value.slice(0, 160) })}
          rows={3}
          maxLength={160}
        />
      </div>
    </div>
  );
}
