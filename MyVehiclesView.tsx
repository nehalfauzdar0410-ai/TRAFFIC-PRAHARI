import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle2,
  FileWarning,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserChallanRecords,
  fetchVehicleSummaryIfVerified,
  normalizePlateNumber,
  registerUserVehicle,
  removeUserVehicle,
  saveDemonstrationChallans,
  verifyVehicleOwnership,
} from '../lib/firestoreData';
import type {
  ChallanRecordDoc,
  RegisteredVehicleDoc,
  VehicleReportSummaryDoc,
} from '../types/domain';
import { StatusTag } from './StatusBadge';

interface MyVehiclesViewProps {
  vehicles: RegisteredVehicleDoc[];
  loading: boolean;
  onRefreshVehicles: () => Promise<void>;
}

export function MyVehiclesView({
  vehicles,
  loading,
  onRefreshVehicles,
}: MyVehiclesViewProps) {
  const { firebaseUser, getIdToken } = useAuth();

  const [regInput, setRegInput] = useState('');
  const [vehicleType, setVehicleType] =
    useState<RegisteredVehicleDoc['vehicleType']>('Four-Wheeler');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVehicle, setSelectedVehicle] =
    useState<RegisteredVehicleDoc | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [vehicleSummary, setVehicleSummary] =
    useState<VehicleReportSummaryDoc | null>(null);
  const [challans, setChallans] = useState<ChallanRecordDoc[]>([]);
  const [challanNote, setChallanNote] = useState<string | null>(null);
  const [challanMode, setChallanMode] = useState<'authorized_api' | 'demonstration'>(
    'demonstration'
  );
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!selectedVehicle && vehicles.length > 0) {
      setSelectedVehicle(vehicles[0]);
    } else if (selectedVehicle) {
      const updated = vehicles.find((v) => v.id === selectedVehicle.id) || null;
      setSelectedVehicle(updated);
    }
  }, [vehicles]);

  useEffect(() => {
    if (!selectedVehicle || !firebaseUser) {
      setVehicleSummary(null);
      setChallans([]);
      setChallanNote(null);
      return;
    }

    if (!selectedVehicle.ownershipVerified) {
      setVehicleSummary(null);
      setChallans([]);
      setChallanNote(null);
      return;
    }

    let active = true;
    async function loadVehicleData() {
      setLoadingDetails(true);
      setError(null);
      try {
        const summary = await fetchVehicleSummaryIfVerified(
          selectedVehicle!.registrationNumber
        );

        const token = await getIdToken();
        const res = await fetch(
          `/api/challans/lookup?plate=${encodeURIComponent(
            selectedVehicle!.registrationNumber
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const lookupData = await res.json();
        if (!res.ok) {
          throw new Error(lookupData.error || 'Unable to query challan adapter.');
        }

        if (lookupData.mode === 'demonstration' && Array.isArray(lookupData.records)) {
          await saveDemonstrationChallans(
            firebaseUser!.uid,
            selectedVehicle!.registrationNumber,
            lookupData.records
          );
        }

        const storedChallans = await fetchUserChallanRecords(firebaseUser!.uid);
        const vehicleChallans = storedChallans.filter(
          (c) => c.vehicleRegNumber === selectedVehicle!.registrationNumber
        );

        if (active) {
          setVehicleSummary(summary);
          setChallans(vehicleChallans);
          setChallanMode(lookupData.mode);
          setChallanNote(lookupData.providerNote || null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Unable to fetch vehicle records.'
          );
        }
      } finally {
        if (active) setLoadingDetails(false);
      }
    }

    void loadVehicleData();
    return () => {
      active = false;
    };
  }, [selectedVehicle, firebaseUser, getIdToken]);

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setError(null);

    const plate = normalizePlateNumber(regInput);
    if (plate.length < 4) {
      setError('Enter a valid vehicle registration number (at least 4 characters).');
      return;
    }

    setAdding(true);
    try {
      const created = await registerUserVehicle({
        uid: firebaseUser.uid,
        registrationNumber: plate,
        vehicleType,
        label,
      });
      setRegInput('');
      setLabel('');
      await onRefreshVehicles();
      setSelectedVehicle(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register vehicle.');
    } finally {
      setAdding(false);
    }
  }

  async function handleVerifyOwnership(vehicle: RegisteredVehicleDoc) {
    setVerifyingId(vehicle.id);
    setError(null);
    try {
      await verifyVehicleOwnership(
        vehicle.id,
        'Self-Declared Ownership (Demo Verification)'
      );
      await onRefreshVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ownership verification failed.');
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDeleteVehicle(vehicleId: string) {
    setError(null);
    try {
      await removeUserVehicle(vehicleId);
      await onRefreshVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove vehicle.');
    }
  }

  return (
    <div className="space-y-8 animate-page-enter">
      <div>
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-[#F15A24] font-semibold">
          Vehicle Compliance & Challan Records
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171A1D] mt-1">
          My Vehicles
        </h1>
        <p className="text-sm text-[#4B5563] mt-1 max-w-2xl">
          Manage your registered vehicles, verify ownership, and inspect associated citizen reports separately from official challan records.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Registered Vehicle Cards Grid + Add Form */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAddVehicle}
          className="lg:col-span-4 bg-white border border-[#E2DFD7] p-6 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-[#171A1D] border-b border-[#E2DFD7] pb-3">
            Register a New Vehicle
          </h2>

          <div>
            <label className="block text-xs font-medium text-[#24282C] mb-1">
              Registration Number *
            </label>
            <input
              type="text"
              required
              value={regInput}
              onChange={(e) => setRegInput(e.target.value.toUpperCase())}
              placeholder="GJ01AB1234"
              className="w-full px-3 py-2 text-sm font-mono uppercase border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#24282C] mb-1">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) =>
                  setVehicleType(e.target.value as RegisteredVehicleDoc['vehicleType'])
                }
                className="w-full px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
              >
                <option value="Two-Wheeler">Two-Wheeler</option>
                <option value="Four-Wheeler">Four-Wheeler</option>
                <option value="Commercial">Commercial</option>
                <option value="Heavy Vehicle">Heavy Vehicle</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#24282C] mb-1">
                Label
              </label>
              <input
                type="text"
                maxLength={60}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Family Car"
                className="w-full px-3 py-2 text-sm border border-[#D4D0C8] bg-white focus:outline-none focus:border-[#F15A24]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={adding}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F15A24] hover:bg-[#D94A17] text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{adding ? 'Registering...' : 'Register Vehicle'}</span>
          </button>
        </form>

        {/* Registered Vehicle Cards */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 bg-white border border-[#E2DFD7] animate-pulse" />
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="bg-white border border-[#E2DFD7] p-10 text-center">
              <Car className="w-7 h-7 text-[#92969A] mx-auto mb-3" />
              <h3 className="font-display text-base font-semibold text-[#171A1D] mb-1">
                No Registered Vehicles
              </h3>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                Register a vehicle number on the left to inspect verified citizen reports and challan records.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vehicles.map((v) => {
                const isSelected = selectedVehicle?.id === v.id;
                return (
                  <div
                    key={v.id}
                    className={`bg-white border p-5 flex flex-col justify-between gap-4 transition-colors ${
                      isSelected
                        ? 'border-[#171A1D] border-t-2 border-t-[#F15A24]'
                        : 'border-[#E2DFD7] hover:border-[#92969A]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                          {v.vehicleType} · {v.label}
                        </div>
                        <div className="font-mono text-xl font-bold text-[#171A1D] mt-1">
                          {v.registrationNumber}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteVehicle(v.id)}
                        aria-label={`Remove ${v.registrationNumber}`}
                        className="text-[#92969A] hover:text-[#B91C1C] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E2DFD7]">
                      <span
                        className={`text-xs font-medium ${
                          v.ownershipVerified ? 'text-[#166534]' : 'text-[#92400E]'
                        }`}
                      >
                        {v.ownershipVerified ? 'Ownership Verified' : 'Verification Pending'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedVehicle(v)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#171A1D] text-white'
                            : 'border border-[#D4D0C8] bg-white hover:bg-[#171A1D] hover:text-white text-[#171A1D]'
                        }`}
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Selected Vehicle Inspection Section */}
      {selectedVehicle && (
        <section className="space-y-6">
          {!selectedVehicle.ownershipVerified ? (
            <div className="bg-white border border-[#E2DFD7] p-8">
              <div className="flex items-start gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-[#F15A24] shrink-0" />
                <div>
                  <h2 className="font-display text-xl font-bold text-[#171A1D]">
                    Verify Ownership for {selectedVehicle.registrationNumber}
                  </h2>
                  <p className="text-sm text-[#4B5563] mt-1 leading-relaxed max-w-2xl">
                    Associated citizen complaints and challan lookups remain locked until vehicle ownership is confirmed. In production this connects to Vahan/DigiLocker; for this portal demonstration, confirm your ownership declaration below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={verifyingId === selectedVehicle.id}
                onClick={() => handleVerifyOwnership(selectedVehicle)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F15A24] hover:bg-[#D94A17] text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {verifyingId === selectedVehicle.id
                    ? 'Verifying Ownership...'
                    : 'Confirm Vehicle Ownership (Demo Verification)'}
                </span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Subsection A: Associated Citizen Reports */}
              <div className="lg:col-span-6 bg-white border border-[#E2DFD7] p-6 space-y-4">
                <div className="border-b border-[#E2DFD7] pb-3">
                  <h2 className="font-display text-base font-semibold text-[#171A1D] flex items-center gap-2">
                    <FileWarning className="w-4 h-4 text-[#F15A24]" />
                    <span>A. Citizen-Submitted Reports ({selectedVehicle.registrationNumber})</span>
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Anonymized citizen complaints verified by administration. Complainant identities are strictly withheld, and citizen complaints are not official challans.
                  </p>
                </div>

                {loadingDetails ? (
                  <div className="h-24 bg-[#F5F3EF] animate-pulse" />
                ) : !vehicleSummary || vehicleSummary.summaries.length === 0 ? (
                  <div className="p-6 bg-[#F5F3EF] border border-[#E2DFD7] text-xs text-[#6B7280]">
                    No verified citizen complaints are currently associated with{' '}
                    <span className="font-mono font-semibold text-[#171A1D]">
                      {selectedVehicle.registrationNumber}
                    </span>
                    .
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E2DFD7] bg-[#F5F3EF] font-mono uppercase text-[#6B7280]">
                          <th className="py-2.5 px-3">Complaint ID</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2DFD7]">
                        {vehicleSummary.summaries.map((item) => (
                          <tr key={item.complaintCode}>
                            <td className="py-2.5 px-3 font-mono font-semibold text-[#171A1D] whitespace-nowrap">
                              {item.complaintCode}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-[#171A1D]">{item.violationType}</div>
                              <div className="text-[#6B7280]">{item.locationText}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                              {item.incidentDate}
                            </td>
                            <td className="py-2.5 px-3">
                              <StatusTag status={item.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Subsection B: Available Challan Records */}
              <div className="lg:col-span-6 bg-white border border-[#E2DFD7] p-6 space-y-4">
                <div className="border-b border-[#E2DFD7] pb-3">
                  <h2 className="font-display text-base font-semibold text-[#171A1D] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#171A1D]" />
                    <span>B. Challan Records ({selectedVehicle.registrationNumber})</span>
                  </h2>
                </div>

                {challanNote && (
                  <div className="p-3.5 bg-[#FEF3C7] border border-[#FCD34D] text-xs text-[#92400E] flex items-start gap-2.5 leading-relaxed">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>
                        {challanMode === 'demonstration'
                          ? 'Demonstration Challan Records (Not Official Live Govt Data): '
                          : 'Authorized eChallan API: '}
                      </strong>
                      {challanNote}
                    </div>
                  </div>
                )}

                {loadingDetails ? (
                  <div className="h-24 bg-[#F5F3EF] animate-pulse" />
                ) : challans.length === 0 ? (
                  <p className="text-xs text-[#6B7280]">No challan records returned.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E2DFD7] bg-[#F5F3EF] font-mono uppercase text-[#6B7280]">
                          <th className="py-2.5 px-3">Challan ID</th>
                          <th className="py-2.5 px-3">Offense & Source</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2DFD7]">
                        {challans.map((c) => (
                          <tr key={c.id}>
                            <td className="py-3 px-3 font-mono font-semibold text-[#171A1D] whitespace-nowrap">
                              <div>{c.challanNumber}</div>
                              <div className="text-[11px] font-normal text-[#6B7280] tabular-nums">
                                {c.incidentDate}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-[#171A1D]">
                                {c.violationCategory}
                              </div>
                              <div className="text-[#6B7280]">{c.locationText}</div>
                              <div className="text-[11px] text-[#92969A] mt-0.5">
                                {c.sourceName}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                              INR {c.amountInr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 border font-medium ${
                                  c.paymentStatus === 'Paid'
                                    ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                                    : 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]'
                                }`}
                              >
                                {c.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
