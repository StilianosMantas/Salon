'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { bid } = useParams()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    avatar_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialProfile, setInitialProfile] = useState({})

  // Add mobile header button
  useEffect(() => {
    const placeholder = document.getElementById('mobile-add-button-placeholder')
    if (placeholder) {
      placeholder.innerHTML = ''
    }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      
      setUser(user)

      // Get profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, role, avatar_url')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      const profileData = {
        full_name: data?.full_name || '',
        email: user.email || '',
        phone: data?.phone || '',
        role: data?.role || 'Staff',
        avatar_url: data?.avatar_url || ''
      }

      setProfile(profileData)
      setInitialProfile(profileData)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function saveProfile() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          phone: profile.phone,
          role: profile.role,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setInitialProfile(profile)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      
      toast.success('Password reset email sent')
    } catch (error) {
      console.error('Error sending password reset:', error)
      toast.error('Failed to send password reset email')
    }
  }

  function isFormDirty() {
    return (
      profile.full_name !== initialProfile.full_name ||
      profile.phone !== initialProfile.phone ||
      profile.role !== initialProfile.role ||
      profile.avatar_url !== initialProfile.avatar_url
    )
  }

  function resetForm() {
    setProfile(initialProfile)
  }

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />
  }

  return (
    <div className="container py-2 px-2" style={{ fontSize: '1.1em', paddingTop: '0.5rem' }}>
      <div className="box extended-card" style={{ fontSize: '1.1em', marginTop: '0.75rem' }}>
        <h1 className="salon-title-sm">User Profile</h1>
        
        <div className="salon-field">
          <label className="salon-label">Full Name</label>
          <div className="salon-control">
            <input
              className="salon-input"
              type="text"
              placeholder="Enter your full name"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
          </div>
        </div>

        <div className="salon-field">
          <label className="salon-label">Email</label>
          <div className="salon-control">
            <input
              className="salon-input"
              type="email"
              value={profile.email}
              disabled
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          </div>
          <p className="salon-help">Email cannot be changed here. Contact support if needed.</p>
        </div>

        <div className="salon-field">
          <label className="salon-label">Phone</label>
          <div className="salon-control">
            <input
              className="salon-input"
              type="tel"
              placeholder="Enter your phone number"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
        </div>

        <div className="salon-field">
          <label className="salon-label">Role</label>
          <div className="salon-control">
            <div className="salon-select">
              <select
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              >
                <option value="Owner">Owner</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
                <option value="Receptionist">Receptionist</option>
              </select>
            </div>
          </div>
        </div>

        <div className="salon-field">
          <label className="salon-label">Avatar URL</label>
          <div className="salon-control">
            <input
              className="salon-input"
              type="url"
              placeholder="Enter avatar image URL"
              value={profile.avatar_url}
              onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
            />
          </div>
          <p className="salon-help">Optional: Link to your profile picture</p>
        </div>

        <div className="salon-field is-grouped">
          <div className="salon-control">
            <button
              className={`salon-button is-success ${saving ? 'is-loading' : ''}`}
              onClick={saveProfile}
              disabled={saving || !isFormDirty()}
            >
              Save Profile
            </button>
          </div>
          {isFormDirty() && (
            <div className="salon-control">
              <button
                className="salon-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel Changes
              </button>
            </div>
          )}
        </div>

        <hr className="my-5" />

        <h2 className="title is-6 mb-3">Account Security</h2>
        
        <div className="salon-field">
          <div className="salon-control">
            <button
              className="salon-button is-info"
              onClick={changePassword}
            >
              <span className="icon">
                <i className="fas fa-key"></i>
              </span>
              <span>Change Password</span>
            </button>
          </div>
          <p className="salon-help mt-2">A password reset link will be sent to your email</p>
        </div>

        <div className="salon-field">
          <label className="salon-label">User ID</label>
          <div className="salon-control">
            <input
              className="salon-input"
              type="text"
              value={user?.id || ''}
              disabled
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', fontSize: '0.75rem' }}
            />
          </div>
          <p className="salon-help">For support purposes only</p>
        </div>
      </div>
    </div>
  )
}