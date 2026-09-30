import notiProofLogo from "@/assets/brand/notiproof-logo.png";
import notiProofIcon from "@/assets/brand/notiproof-icon.png";
import { cn } from "@/lib/utils";

type NotiProofBrandProps = {
  variant?: "logo" | "icon" | "sidebar";
  className?: string;
};

export function NotiProofBrand({ variant = "logo", className }: NotiProofBrandProps) {
  if (variant === "icon") {
    return (
      <img
        src={notiProofIcon}
        alt="NotiProof"
        width={32}
        height={32}
        className={cn("size-8 shrink-0 object-contain", className)}
      />
    );
  }

  if (variant === "sidebar") {
    return (
      <span
        className={cn(
          "flex h-10 w-full min-w-0 items-center rounded bg-brand-surface px-2 py-1.5 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1",
          className,
        )}
      >
        <img
          src={notiProofLogo}
          alt="NotiProof"
          width={126}
          height={40}
          className="h-7 w-auto max-w-full object-contain object-left group-data-[collapsible=icon]:hidden"
        />
        <img
          src={notiProofIcon}
          alt="NotiProof"
          width={28}
          height={28}
          className="hidden size-6 shrink-0 object-contain group-data-[collapsible=icon]:block"
        />
      </span>
    );
  }

  return (
    <img
      src={notiProofLogo}
      alt="NotiProof"
      width={158}
      height={50}
      className={cn("h-10 w-auto object-contain", className)}
    />
  );
}