import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, User as UserIcon } from "lucide-react";
import { profileSchema, emailSchema, passwordSchema, parseOrError } from "@/lib/validation";

export default function AccountSettings() {
  const { user, profile, refresh } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState((profile as any)?.avatar_url ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setAvatarUrl((profile as any)?.avatar_url ?? "");
    setNewEmail(user?.email ?? "");
  }, [profile, user]);

  const saveProfile = async () => {
    if (!user) return;
    const parsed = parseOrError(profileSchema, {
      full_name: fullName,
      avatar_url: avatarUrl || undefined,
    });
    if (parsed.error) {
      return toast({ title: "Check your details", description: parsed.error, variant: "destructive" });
    }
    setSavingProfile(true);
    const { error } = await (supabase as any)
      .from("users")
      .update({ full_name: parsed.data.full_name, avatar_url: parsed.data.avatar_url ?? null })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) return toast({ title: "Couldn't save profile", description: error.message, variant: "destructive" });
    toast({ title: "Profile saved" });
    await refresh();
  };

  const onPickFile = () => fileRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      return toast({ title: "Unsupported image", description: "Use JPEG, PNG, WebP or GIF.", variant: "destructive" });
    }
    if (file.size > 2 * 1024 * 1024) {
      return toast({ title: "Image too large", description: "Max 2 MB", variant: "destructive" });
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "png").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    setUploading(false);
    toast({ title: "Avatar uploaded", description: "Click Save to apply." });
  };

  const saveEmail = async () => {
    if (!newEmail || newEmail === user?.email) return;
    const parsed = emailSchema.safeParse(newEmail);
    if (!parsed.success) {
      return toast({ title: "Invalid email", description: parsed.error.issues[0]?.message ?? "Enter a valid email", variant: "destructive" });
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: parsed.data });
    setSavingEmail(false);
    if (error) return toast({ title: "Couldn't update email", description: error.message, variant: "destructive" });
    toast({
      title: "Confirmation sent",
      description: "Check both your old and new inbox to confirm the change.",
    });
  };

  const savePassword = async () => {
    if (!user?.email) return;
    const parsed = passwordSchema.safeParse(newPw);
    if (!parsed.success) {
      return toast({ title: "Choose a stronger password", description: parsed.error.issues[0]?.message ?? "Use 8+ chars with letters and numbers", variant: "destructive" });
    }
    if (newPw !== confirmPw) return toast({ title: "Passwords don't match", variant: "destructive" });
    setSavingPw(true);
    // Re-authenticate first
    const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
    if (reauthErr) {
      setSavingPw(false);
      return toast({ title: "Current password incorrect", description: reauthErr.message, variant: "destructive" });
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) return toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    toast({ title: "Password updated" });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My profile</CardTitle>
          <CardDescription>How your name and avatar appear to your team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-7 w-7" />
              )}
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={onPickFile} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload avatar
              </Button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileChange} />
              <p className="mt-2 text-xs text-muted-foreground">PNG or JPG, up to 5 MB.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={fullName} maxLength={120} autoComplete="name" onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email address</CardTitle>
          <CardDescription>Changing your email requires confirmation from both inboxes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={newEmail} maxLength={254} inputMode="email" autoComplete="email" onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveEmail} disabled={savingEmail || newEmail === user?.email}>
              {savingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update email
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>You'll be asked for your current password to confirm.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current password</Label>
            <PasswordInput value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <PasswordInput value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" minLength={8} />
          </div>
          <div className="space-y-2">
            <Label>Confirm new password</Label>
            <PasswordInput value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" minLength={8} />
          </div>
          <div className="flex justify-end">
            <Button onClick={savePassword} disabled={savingPw || !currentPw || !newPw || !confirmPw}>
              {savingPw ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
