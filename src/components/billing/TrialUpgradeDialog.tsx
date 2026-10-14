import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UPGRADE_REQUIRED_EVENT } from "@/hooks/useTrialGate";

/** Mounted once in the app layout; opens whenever a view-only account tries to make a change. */
export function TrialUpgradeDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onRequired = () => setOpen(true);
    window.addEventListener(UPGRADE_REQUIRED_EVENT, onRequired);
    return () => window.removeEventListener(UPGRADE_REQUIRED_EVENT, onRequired);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to continue</DialogTitle>
          <DialogDescription>
            Your free trial has ended, so your account is view-only and your proof is paused on your site.
            Upgrade to make changes and switch your proof back on instantly. Everything you've set up is saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Not now</Button>
          <Button onClick={() => { setOpen(false); navigate("/settings/billing"); }}>See plans</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
