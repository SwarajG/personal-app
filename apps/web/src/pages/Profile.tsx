import { useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from '@tanstack/react-router'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { profileApi } from '@/api/authApi'
import type { ProfileUser } from '@/api/authApi'
import { setUser, logout } from '@/store/authSlice'
import { getPublicUrl } from '@/api/mediaApi'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function Profile() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Form fields
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Profile picture upload
  const [isUploadingPicture, setIsUploadingPicture] = useState(false)
  const [picturePreview, setPicturePreview] = useState<string | null>(null)

  // Delete account dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    profileApi.getProfile()
      .then(({ user }) => {
        setProfile(user)
        setName(user.name || '')
        setUsername(user.username || '')
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setIsLoading(false))
  }, [])

  const getAvatarSrc = () => {
    if (picturePreview) return picturePreview
    if (profile?.profilePicture) return getPublicUrl(profile.profilePicture)
    return profile?.avatar || undefined
  }

  const getInitials = () => {
    const n = profile?.name || profile?.email || 'U'
    return n.charAt(0).toUpperCase()
  }

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB')
      return
    }

    // Show local preview
    const reader = new FileReader()
    reader.onload = (ev) => setPicturePreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setIsUploadingPicture(true)
    try {
      const { uploadUrl, fileKey } = await profileApi.getProfilePictureUploadUrl(file.type)
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        withCredentials: false,
      })
      const { profilePictureUrl } = await profileApi.saveProfilePicture(fileKey)
      setProfile(prev => prev ? { ...prev, profilePicture: fileKey, profilePictureUrl } : prev)
      // Update Redux so navbar avatar updates
      dispatch(setUser({ id: profile!.id, email: profile!.email, name: profile?.name, username: profile?.username, avatar: profile?.avatar, profilePicture: fileKey, createdAt: profile!.createdAt }))
      toast.success('Profile picture updated')
    } catch {
      toast.error('Failed to upload profile picture')
      setPicturePreview(null)
    } finally {
      setIsUploadingPicture(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const { user: updated } = await profileApi.updateProfile({ name, username })
      setProfile(updated)
      // Sync Redux so navbar name/initials update
      dispatch(setUser({ id: updated.id, email: updated.email, name: updated.name, username: updated.username, avatar: updated.avatar, profilePicture: updated.profilePicture, createdAt: updated.createdAt }))
      toast.success('Profile updated')
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update profile'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await profileApi.deleteAccount()
      dispatch(logout())
      navigate({ to: '/login' })
      toast.success('Account deleted')
    } catch {
      toast.error('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information.</p>
      </div>

      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Click the avatar to upload a new photo. Supports JPEG, PNG, WebP, GIF up to 5 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24">
              <AvatarImage src={getAvatarSrc()} alt="Profile" />
              <AvatarFallback className="text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPicture}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            >
              {isUploadingPicture
                ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                : <Camera className="w-6 h-6 text-white" />
              }
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{profile?.name || 'No name set'}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {profile?.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handlePictureChange}
          />
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your display name and username.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm h-9">
                @
              </span>
              <Input
                id="username"
                placeholder="your_username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="rounded-l-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3-20 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Input id="email" value={profile?.email || ''} disabled className="text-muted-foreground" />
              {profile?.googleId && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">via Google</span>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you absolutely sure? This will permanently delete your account, all your posts,
              media, and data. This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isDeleting ? 'Deleting…' : 'Yes, delete my account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
