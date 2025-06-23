"use client";

import { useAuth } from '@/contexts/OptimizedAuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, UserCog, ShieldCheck, Palette, BellDot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/services/userService';
import { changePassword, changeEmail } from '@/lib/services/authService';

export default function SettingsPage() {
  const { userProfile, authUser, isLoading: authLoading, refreshProfile, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace('/login');
    }
    if (userProfile) {
      setUsername(userProfile.username);
      setName(userProfile.name || '');
      setBio(userProfile.bio || '');
      setAvatarUrl(userProfile.avatar_url || '');
    }
  }, [authLoading, authUser, userProfile, router]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    // Basic validation (username is now read-only)

    if (name && name.length > 100) {
      toast({ title: "Error", description: "Name must be less than 100 characters.", variant: "destructive" });
      return;
    }

    if (bio && bio.length > 500) {
      toast({ title: "Error", description: "Bio must be less than 500 characters.", variant: "destructive" });
      return;
    }

    if (avatarUrl && avatarUrl.length > 1024) {
      toast({ title: "Error", description: "Avatar URL must be less than 1024 characters.", variant: "destructive" });
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        id: userProfile.id,
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      });
      
      // Re-fetch user profile to update the context with the new data
      await refreshProfile();
      
      toast({ 
        title: "Profile Updated", 
        description: "Your profile has been successfully updated." 
      });
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      
      // Handle specific error cases
      if (error.message?.includes('username')) {
        toast({ 
          title: "Username Error", 
          description: "This username is already taken. Please choose a different one.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Error", 
          description: error.message || "Could not update profile. Please try again.", 
          variant: "destructive" 
        });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    // Basic validation
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters long.", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      toast({ 
        title: "Password Changed", 
        description: "Your password has been successfully changed." 
      });
    } catch (error: any) {
      console.error("Failed to change password:", error);
      
      toast({ 
        title: "Error", 
        description: error.message || "Could not change password. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    // Basic validation
    if (!newEmail.trim()) {
      toast({ title: "Error", description: "Email is required.", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    if (newEmail === authUser.email) {
      toast({ title: "Error", description: "New email must be different from current email.", variant: "destructive" });
      return;
    }

    setIsSavingEmail(true);
    try {
      await changeEmail(newEmail);
      setNewEmail('');
      toast({ 
        title: "Email Change Initiated", 
        description: "Please check your new email address for a confirmation link." 
      });
    } catch (error: any) {
      console.error("Failed to change email:", error);
      
      toast({ 
        title: "Error", 
        description: error.message || "Could not change email. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  if (authLoading || !userProfile) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold font-headline text-primary">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserCog className="mr-2 h-5 w-5" /> Profile Settings</CardTitle>
          <CardDescription>Manage your public profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={username} 
                  disabled
                  placeholder="Your unique username"
                />
                <p className="text-xs text-muted-foreground">
                  Username cannot be changed to maintain profile links and references.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Your full name (optional)"
                  maxLength={100}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input 
                id="avatarUrl" 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)} 
                placeholder="https://example.com/avatar.png"
                maxLength={1024}
              />
              {avatarUrl && (
                <div className="mt-2">
                  <img 
                    src={avatarUrl} 
                    alt="Avatar preview" 
                    className="h-20 w-20 rounded-full object-cover border-2 border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Tell us a bit about yourself..." 
                className="min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/500 characters
              </p>
            </div>
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile Changes
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Account Settings (Email, Password) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5" /> Account Settings</CardTitle>
          <CardDescription>Manage your login email and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Email</Label>
            <Input value={authUser?.email || 'loading...'} disabled />
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Change Email</h4>
              <form onSubmit={handleEmailChange} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newEmail">New Email Address</Label>
                  <Input 
                    id="newEmail" 
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                  />
                </div>
                <Button type="submit" disabled={isSavingEmail} size="sm">
                  {isSavingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Email
                </Button>
              </form>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Change Password</h4>
            <form onSubmit={handlePasswordChange} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={8}
                />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input 
                  id="confirmNewPassword" 
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={8}
                />
            </div>
              <Button type="submit" disabled={isSavingPassword} size="sm">
                {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
            </Button>
          </form>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><BellDot className="mr-2 h-5 w-5" /> Notification Settings</CardTitle>
          <CardDescription>Control what you get notified about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor="email-new-follower" className="flex-1">Email for new followers</Label>
                <Switch id="email-new-follower" disabled />
            </div>
             <div className="flex items-center justify-between p-3 border rounded-md">
                <Label htmlFor="email-review-likes" className="flex-1">Email for likes on your reviews</Label>
                <Switch id="email-review-likes" defaultChecked disabled />
            </div>
          <p className="text-sm text-muted-foreground">Notification settings are not yet functional.</p>
        </CardContent>
      </Card>

      {/* Placeholder for Appearance Settings */}
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5" /> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the app.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">Dark mode / Light mode toggle (typically handled by system or a theme switcher in Header/Layout) - Not implemented here.</p>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="destructive" onClick={logout}>Log Out</Button>
      </div>

    </div>
  );
}
