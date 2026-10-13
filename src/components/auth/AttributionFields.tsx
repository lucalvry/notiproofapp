import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SIGNUP_REASONS, SIGNUP_SOURCES, type AttributionAnswers } from "@/lib/attribution";

interface Props {
  value: AttributionAnswers;
  onChange: (v: AttributionAnswers) => void;
  /** Locks the source to "referral" when the visitor arrived via a referral link. */
  referredBy?: string | null;
}

export function AttributionFields({ value, onChange, referredBy }: Props) {
  const set = (patch: Partial<AttributionAnswers>) => onChange({ ...value, ...patch });
  const sourceOpt = SIGNUP_SOURCES.find((s) => s.value === value.source);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reason">What brings you to NotiProof?</Label>
        <Select value={value.reason} onValueChange={(v) => set({ reason: v })}>
          <SelectTrigger id="reason"><SelectValue placeholder="Choose one" /></SelectTrigger>
          <SelectContent>
            {SIGNUP_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {value.reason === "other" && (
          <Input aria-label="Your reason" placeholder="Tell us a bit more" maxLength={300} value={value.reasonOther} onChange={(e) => set({ reasonOther: e.target.value })} />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="source">Where did you hear about us?</Label>
        {referredBy ? (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">Referred by {referredBy}</p>
        ) : (
          <>
            <Select value={value.source} onValueChange={(v) => set({ source: v, sourceDetail: "" })}>
              <SelectTrigger id="source"><SelectValue placeholder="Choose one" /></SelectTrigger>
              <SelectContent>
                {SIGNUP_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {sourceOpt?.followUp && (
              <Input aria-label={sourceOpt.followUp} placeholder={sourceOpt.followUp} maxLength={300} value={value.sourceDetail} onChange={(e) => set({ sourceDetail: e.target.value })} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
