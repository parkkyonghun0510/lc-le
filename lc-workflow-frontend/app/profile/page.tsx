'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useUpdateProfile, useChangePassword } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { useBranches } from '@/hooks/useBranches';
import { usePositions } from '@/hooks/usePositions';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Eye, EyeOff, Save, User as UserIcon, Mail, Phone, Shield, Building, MapPin, Briefcase, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import ProfilePhotoUpload from '@/components/users/ProfilePhotoUpload';
import { getInitials } from '@/components/users/OptimizedAvatar';

export default function ProfilePage() {
  const { user } = useAuthContext();
  const updateProfile = useUpdateProfile(user?.id || '');
  const changePassword = useChangePassword();

  // Enhanced profile data with all available fields
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    username: '',
    employee_id: '',
    role: '',
    status: '',
    department_id: '',
    branch_id: '',
    position_id: '',
    profile_image_url: '',
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  // UI state
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Fetch dropdown options using hooks
  const { data: departmentsData, isLoading: loadingDepartments } = useDepartments({ size: 100 });
  const { data: branchesData, isLoading: loadingBranches } = useBranches({ size: 100 });
  const { data: positionsData, isLoading: loadingPositions } = usePositions({ size: 100 });

  const loadingOptions = loadingDepartments || loadingBranches || loadingPositions;

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        username: user.username || '',
        employee_id: user.employee_id || '',
        role: user.role || '',
        status: user.status || 'active',
        department_id: user.department_id || '',
        branch_id: user.branch_id || '',
        position_id: user.position_id || '',
        profile_image_url: user.profile_image_url || '',
      });
    }
  }, [user]);

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateProfileForm = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.first_name) {
      newErrors.first_name = 'First name is required';
    }

    if (!profileData.last_name) {
      newErrors.last_name = 'Last name is required';
    }

    if (!profileData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(profileData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (profileData.employee_id && !/^\d{4}$/.test(profileData.employee_id)) {
      newErrors.employee_id = 'Employee ID must be exactly 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.old_password) {
      newErrors.old_password = 'Current password is required';
    }

    if (!passwordData.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 6) {
      newErrors.new_password = 'Password must be at least 6 characters';
    }

    if (!passwordData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateProfileForm()) {
      return;
    }

    // Strip empty fields and ensure employee_id is 4 digits or omitted
    const filteredData = Object.fromEntries(
      Object.entries(profileData).filter(([key, value]) => {
        if (key === 'employee_id') {
          return value && /^\d{4}$/.test(value);
        }
        return value !== '' && value !== undefined && value !== null;
      })
    );

    updateProfile.mutate(filteredData, {
      onSuccess: () => {
        toast.success('Profile updated successfully');
      },
      onError: (error) => {
        toast.error('Failed to update profile');
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    changePassword.mutate({
      old_password: passwordData.old_password,
      new_password: passwordData.new_password,
    }, {
      onSuccess: () => {
        setPasswordData({
          old_password: '',
          new_password: '',
          confirm_password: '',
        });
        toast.success('Password changed successfully');
      },
      onError: () => {
        toast.error('Failed to change password');
      }
    });
  };

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  if (!user) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

          {/* Profile Header with Photo Upload */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                {/* Profile Photo Upload */}
                <div className="flex-shrink-0">
                  <ProfilePhotoUpload
                    userId={user.id}
                    currentPhotoUrl={profileData.profile_image_url}
                    userName={`${user.first_name} ${user.last_name}`}
                    userInitials={getInitials(user.first_name, user.last_name)}
                    onUploadSuccess={(urls) => {
                      setProfileData(prev => ({ ...prev, profile_image_url: urls.primary_url }));
                      toast.success('Profile photo updated successfully!');
                    }}
                    onUploadError={(error) => {
                      toast.error(error);
                    }}
                    size="xl"
                    editable={true}
                  />
                </div>
                
                {/* User Info */}
                <div className="text-white text-center md:text-left flex-1">
                  <h2 className="text-2xl font-bold">
                    {user.first_name} {user.last_name}
                  </h2>
                  <p className="text-blue-100">@{user.username}</p>
                  <div className="flex items-center justify-center md:justify-start mt-2 gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </span>
                    {user.position ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                        <span className="truncate max-w-[12rem]">
                          {user.position.name}
                          {user.position.description && (
                            <span className="ml-1 opacity-80">({user.position.description})</span>
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/20">
                        No position assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'password'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Change Password
                </button>
              </nav>
            </div>

            {/* Profile Information Form */}
            {activeTab === 'profile' && (
              <div className="p-6">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <UserIcon className="h-5 w-5 mr-2" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={profileData.first_name}
                          onChange={(e) => handleProfileChange('first_name', e.target.value)}
                          className={`w-full px-3 py-2 border ${errors.first_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                        {errors.first_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={profileData.last_name}
                          onChange={(e) => handleProfileChange('last_name', e.target.value)}
                          className={`w-full px-3 py-2 border ${errors.last_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                        {errors.last_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            value={profileData.email}
                            onChange={(e) => handleProfileChange('email', e.target.value)}
                            className={`w-full pl-10 px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          />
                        </div>
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            value={profileData.phone_number}
                            onChange={(e) => handleProfileChange('phone_number', e.target.value)}
                            className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Employee ID */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employee ID (4 digits)
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          pattern="\d{4}"
                          value={profileData.employee_id}
                          onChange={(e) => handleProfileChange('employee_id', e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                          className={`w-full px-3 py-2 border ${errors.employee_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          placeholder="e.g. 1234"
                        />
                        {errors.employee_id && (
                          <p className="mt-1 text-sm text-red-600">{errors.employee_id}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Organizational Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Organizational Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Role */}
                      {isAdminOrManager && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <select
                            value={profileData.role}
                            onChange={(e) => handleProfileChange('role', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Role</option>
                            <option value="officer">Officer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      )}

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={profileData.status}
                          onChange={(e) => handleProfileChange('status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <select
                          value={profileData.department_id}
                          onChange={(e) => handleProfileChange('department_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={loadingOptions}
                        >
                          <option value="">Select Department</option>
                          {departmentsData?.items?.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </select>
                        {loadingOptions && (
                          <p className="mt-1 text-sm text-gray-500">Loading departments...</p>
                        )}
                      </div>

                      {/* Branch */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Branch
                        </label>
                        <select
                          value={profileData.branch_id}
                          onChange={(e) => handleProfileChange('branch_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={loadingOptions}
                        >
                          <option value="">Select Branch</option>
                          {branchesData?.items?.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </option>
                          ))}
                        </select>
                        {loadingOptions && (
                          <p className="mt-1 text-sm text-gray-500">Loading branches...</p>
                        )}
                      </div>

                      {/* Position */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Position
                        </label>
                        <select
                          value={profileData.position_id}
                          onChange={(e) => handleProfileChange('position_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={loadingOptions}
                        >
                          <option value="">Select Position</option>
                          {positionsData?.items?.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.name}
                              {position.description && ` - ${position.description}`}
                            </option>
                          ))}
                        </select>
                        {loadingOptions && (
                          <p className="mt-1 text-sm text-gray-500">Loading positions...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updateProfile.isPending}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {updateProfile.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Change Password Form */}
            {activeTab === 'password' && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={passwordData.old_password}
                        onChange={(e) => handlePasswordChange('old_password', e.target.value)}
                        className={`w-full pr-10 px-3 py-2 border ${errors.old_password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                      >
                        {showOldPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.old_password && (
                      <p className="mt-1 text-sm text-red-600">{errors.old_password}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                        className={`w-full pr-10 px-3 py-2 border ${errors.new_password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.new_password && (
                      <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirm_password}
                        onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                        className={`w-full pr-10 px-3 py-2 border ${errors.confirm_password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.confirm_password && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={changePassword.isPending}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {changePassword.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}