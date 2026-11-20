import React, { useEffect, useState } from 'react';
import { Check, Save, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { normalizePlateNumber, registerUserVehicle } from '../lib/firestoreData';

export function ProfileView({ isOnboarding = false }: { isOnboarding?: boolean }) {
  const { firebaseUser, userDoc, profileDoc, isAdmin, saveProfile } = useAuth();
  const [fullName, setFullName] = useState(
    profileDoc?.fullName || userDoc?.fullName || firebaseUser?.displayName || ''
  );
  const [mobileNumber, setMobileNumber] = useState(profileDoc?.mobileNumber || '');
  const [primaryVehicleReg, setPrimaryVehicleReg] = useState(profileDoc?.primaryVehicleReg || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFullName(profileDoc?.fullName || userDoc?.fullName || firebaseUser?.displayName || '');
    setMobileNumber(profileDoc?.mobileNumber || '');
    setPrimaryVehicleReg(profileDoc?.primaryVehicleReg || '');
  }, [profileDoc, userDoc, firebaseUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedSuccess(false);

    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (mobileNumber.trim().length < 8) {
      setError('Please enter a valid mobile number (at least 8 digits).');
      return;
    }

    setSaving(true);
    try {
      const cleanPlate = normalizePlateNumber(primaryVehicleReg);
      await saveProfile({
        fullName,
        mobileNumber,
        primaryVehicleReg: cleanPlate,
      });

      if (cleanPlate.length >= 4 && firebaseUser) {
        await registerUserVehicle({
          uid: firebaseUser.uid,
          registrationNumber: cleanPlate,
          vehicleType: 'Four-Wheeler',
          label: 'Primary Vehicle',
        });
      }

      setSavedSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-page-enter">
      <div className="bg-white border border-[#E2DFD7] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DFD7] pb-5 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.12em] text-[#F15A24] font-semibold mb-1">
              Account Identity
            </p>
            <h1 className="font-display text-2xl font-bold text-[#171A1D]">
              {isOnboarding ? 'Complete Your Citizen Profile' : 'User Profile & Account Details'}
            </h1>
            <p className="text-sm text-[#4B5563] mt-1">
              {isOnboarding
                ? 'Provide your contact number so complaints and vehicle records are accurately linked to your account.'
                : 'Your contact details are isolated privately and never disclosed to other citizens.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#171A1D] bg-[#F5F3EF] border border-[#E2DFD7] px-2.5 py-1 shrink-0">
            {isAdmin ? <Shield className="w-3.5 h-3.5 text-[#F15A24]" /> : <UserCheck className="w-3.5 h-3.5" />}
            <span>{isAdmin ? 'ADMIN' : 'CITIZEN'}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="mb-4 p-3 bg-[#DCFCE7] border border-[#86EFAC] text-xs text-[#166534] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Profile saved securely.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#24282C] mb-1">
              Registered Email Address
            </label>
            <input
              type="email"
              disabled
              value={firebaseUser?.email || profileDoc?.email || ''}
              className="w-full px-3 py-2 text-sm bg-[#F5F3EF] border border-[#E2DFD7] text-[#6B7280] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#24282C] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full legal name"
              className="w-full px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#24282C] mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              required
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#24282C] mb-1">
              Primary Vehicle Registration Number (Optional)
            </label>
            <input
              type="text"
              value={primaryVehicleReg}
              onChange={(e) => setPrimaryVehicleReg(e.target.value.toUpperCase())}
              placeholder="e.g. GJ01AB1234"
              className="w-full px-3 py-2 text-sm font-mono uppercase border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
            />
            <p className="text-xs text-[#6B7280] mt-1">
              Adding a registration number links it to your My Vehicles workspace for notice and challan lookups.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F15A24] hover:bg-[#D94A17] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Profile...' : isOnboarding ? 'Save & Enter Portal' : 'Update Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
