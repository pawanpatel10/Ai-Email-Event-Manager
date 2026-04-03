import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProfileSettings.css';

function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    phone: '',
    address: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      const parts = (user.name || '').split(' ');
      setProfileData(prev => ({
        ...prev,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || '',
        dob: user.dob ? user.dob.split('T')[0] : ''
      }));
    }
  }, [user]);

  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // API call to update user details would go here if implemented on backend
      alert('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  return (
    <div className="profile-settings-page">
      <nav className="settings-nav">
        <button className="back-btn" onClick={() => navigate('/home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Dashboard
        </button>
        <h2>Profile Settings</h2>
      </nav>

      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="profile-summary">
            <div className="avatar-large">
              {(profileData.firstName ? profileData.firstName.charAt(0) : 'U').toUpperCase()}
              {(profileData.lastName ? profileData.lastName.charAt(0) : '').toUpperCase()}
            </div>
            <h3>{profileData.firstName} {profileData.lastName}</h3>
            <p>{profileData.email}</p>
          </div>
          <ul className="settings-menu">
            <li className="active">Personal Information</li>
            <li>Security & Password</li>
            <li>Notification Preferences</li>
          </ul>
        </div>

        <div className="settings-content">
          <div className="content-header">
            <div>
              <h3>Personal Information</h3>
              <p>Update your personal details and contact information.</p>
            </div>
            {!isEditing && (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>

          <form className="settings-form" onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input 
                  type="text" 
                  name="firstName" 
                  value={profileData.firstName} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input 
                  type="text" 
                  name="lastName" 
                  value={profileData.lastName} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email" 
                value={profileData.email} 
                onChange={handleChange}
                disabled={!isEditing}
                required 
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input 
                  type="date" 
                  name="dob" 
                  value={profileData.dob} 
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={profileData.phone} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input 
                type="text" 
                name="address" 
                value={profileData.address} 
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="City, Country"
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea 
                name="bio" 
                value={profileData.bio} 
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Tell us a little about yourself"
                rows="4"
              ></textarea>
            </div>

            {isEditing && (
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Settings;
