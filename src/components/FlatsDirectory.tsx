import React, { useState, useEffect } from 'react';
import { Home, Users, Car, CheckCircle2, Plus, Trash2, Search, Lock, ShieldCheck, LayoutGrid, Table } from 'lucide-react';
import { Flat } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { DeveloperDeleteModal } from './DeveloperDeleteModal.js';

interface FlatsDirectoryProps {
  onOpenClaimModal: () => void;
}

export const FlatsDirectory: React.FC<FlatsDirectoryProps> = ({ onOpenClaimModal }) => {
  const { currentUser } = useAuth();
  const [flats, setFlats] = useState<Flat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [isLoading, setIsLoading] = useState(false);

  // Add Flat Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFlatNum, setNewFlatNum] = useState('');
  const [newBlock, setNewBlock] = useState('A');
  const [newFloor, setNewFloor] = useState(1);
  const [newArea, setNewArea] = useState(1350);
  const [newOccupantName, setNewOccupantName] = useState('');
  const [newOccupantPhone, setNewOccupantPhone] = useState('');
  const [newOccupancyType, setNewOccupancyType] = useState<'OWNER' | 'TENANT'>('OWNER');

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; flat_number: string } | null>(null);

  const fetchFlats = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = currentUser?.token || localStorage.getItem('openapt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/flats', { headers });
      const data = await res.json();
      setFlats(data);
    } catch (err) {
      console.error('Failed to load flats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/society/config')
      .then(r => r.json())
      .then(d => setIsConfigured(d.configured))
      .catch(() => setIsConfigured(false));
  }, []);

  useEffect(() => {
    if (isConfigured) {
      fetchFlats();
    }
  }, [currentUser, isConfigured]);

  if (isConfigured === false) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-[#e5e7eb] rounded-xl">
        <h2 className="text-lg font-bold text-[#1f2937]">Apartment Not Configured</h2>
        <p className="text-[#6b7280] text-sm mt-2">The apartment structure has not been configured.</p>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Set Up Apartment</button>
      </div>
    );
  }
  
  if (isConfigured === null) return <div>Loading...</div>;


  const handleAddFlat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlatNum.trim()) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = currentUser?.token || localStorage.getItem('openapt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/flats', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          flat_number: newFlatNum.trim(),
          block: newBlock,
          floor: Number(newFloor),
          area_sqft: Number(newArea),
          maintenance_paise: 450000,
          occupant_name: newOccupantName.trim(),
          occupant_phone: newOccupantPhone.trim(),
          occupant_type: newOccupancyType,
          actor: currentUser,
        }),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewFlatNum('');
        setNewOccupantName('');
        setNewOccupantPhone('');
        fetchFlats();
      }
    } catch (err) {
      console.error('Failed to add flat:', err);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = ['SUPER_ADMIN', 'PRESIDENT', 'SECRETARY'].includes(currentUser?.role || '');

  const filteredFlats = flats.filter(f => {
    const matchesSearch =
      f.flat_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.resident_name && f.resident_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.resident_phone && f.resident_phone.includes(searchTerm));
    const matchesBlock = blockFilter === 'ALL' || f.block === blockFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CLAIMED' && f.is_claimed) ||
      (statusFilter === 'UNCLAIMED' && !f.is_claimed);
    return matchesSearch && matchesBlock && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="p-4 bg-white border border-[#e5e7eb] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-[#1f2937]">Flats Directory & Occupancy</h3>
          <p className="text-xs text-[#6b7280]">
            Units in Subhashini Star Enclave (SSE), resident records, occupancy status, and parking allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[#f5f6f8] p-0.5 rounded-lg border border-[#e5e7eb] text-xs">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-md flex items-center gap-1 font-semibold transition cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-white text-blue-600 shadow-xs' : 'text-[#6b7280]'
              }`}
              title="Table view with horizontal scroll"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`p-1.5 rounded-md flex items-center gap-1 font-semibold transition cursor-pointer ${
                viewMode === 'CARDS' ? 'bg-white text-blue-600 shadow-xs' : 'text-[#6b7280]'
              }`}
              title="Card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Flat</span>
            </button>
          )}

          {(!currentUser || (currentUser?.role === 'RESIDENT' && !currentUser.flat_id)) && (
            <button
              onClick={onOpenClaimModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Claim Flat</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search flat number, resident name, or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:border-blue-600 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={blockFilter}
            onChange={e => setBlockFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600 transition"
          >
            <option value="ALL">All Blocks</option>
            <option value="A">Block A</option>
            <option value="B">Block B</option>
            <option value="C">Block C</option>
            <option value="D">Block D</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937] focus:outline-none focus:border-blue-600 transition"
          >
            <option value="ALL">All Status</option>
            <option value="CLAIMED">Claimed (Active)</option>
            <option value="UNCLAIMED">Unclaimed / Vacant</option>
          </select>
        </div>
      </div>

      {/* TABLE VIEW: FULL COLUMNS WITHOUT CLIPPING */}
      {viewMode === 'TABLE' && (
        <div className="overflow-x-auto bg-white border border-[#e5e7eb] rounded-lg shadow-xs">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280] font-semibold uppercase text-[11px] whitespace-nowrap">
                <th className="py-3 px-4 whitespace-nowrap">Flat No</th>
                <th className="py-3 px-4 whitespace-nowrap">Block & Floor</th>
                <th className="py-3 px-4 whitespace-nowrap">Area (sq.ft)</th>
                <th className="py-3 px-4 whitespace-nowrap">Monthly Maintenance</th>
                <th className="py-3 px-4 whitespace-nowrap">Resident Occupant</th>
                <th className="py-3 px-4 whitespace-nowrap">Contact Phone</th>
                <th className="py-3 px-4 whitespace-nowrap">Type</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Vehicles & Family</th>
                <th className="py-3 px-4 whitespace-nowrap">Dues</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f1f3] text-[#374151]">
              {filteredFlats.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-[#9ca3af] italic text-xs">
                    No matching flats found in directory.
                  </td>
                </tr>
              ) : (
                filteredFlats.map(flat => {
                  const hasTwoWheelers = flat.vehicles_data?.two_wheelers?.length || 0;
                  const hasCars = flat.vehicles_data?.cars?.length || 0;

                  return (
                    <tr key={flat.id} className="hover:bg-[#f9fafb]">
                      <td className="py-2.5 px-4 font-bold text-blue-600 font-mono whitespace-nowrap">
                        Flat {flat.flat_number}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-[#4b5563]">
                        Block {flat.block} · Floor {flat.floor}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono">
                        {flat.area_sqft} sq.ft
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono font-semibold text-[#1f2937]">
                        ₹{(flat.maintenance_paise / 100).toLocaleString('en-IN')}/mo
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-medium text-[#1f2937]">
                        {flat.resident_name || <span className="text-[#9ca3af] italic">Unregistered</span>}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[#6b7280]">
                        {flat.resident_phone || '-'}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold text-[#4b5563] uppercase bg-[#f5f6f8] px-1.5 py-0.5 rounded">
                          {flat.occupancy_type || 'OWNER'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-block py-0.5 px-2 rounded-full text-[10px] font-semibold ${
                          flat.is_claimed ? 'badge-paid' : 'badge-pending'
                        }`}>
                          {flat.is_claimed ? 'Claimed' : 'Unclaimed'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-[11px] text-[#6b7280]">
                        {flat.family_count ? `${flat.family_count} Family · ` : ''}
                        {hasTwoWheelers > 0 || hasCars > 0
                          ? `${hasTwoWheelers} 2W, ${hasCars} 4W`
                          : 'No vehicles registered'}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono">
                        {flat.outstanding_paise === null || flat.outstanding_paise === undefined ? (
                          <span className="text-[#9ca3af]">-</span>
                        ) : flat.outstanding_paise > 0 ? (
                          <span className="text-[#b42318] font-bold">₹{(flat.outstanding_paise / 100).toLocaleString('en-IN')} Due</span>
                        ) : (
                          <span className="text-[#16803c] font-semibold">Cleared</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {!flat.is_claimed && (
                            <button
                              onClick={onOpenClaimModal}
                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Claim
                            </button>
                          )}
                          {isSuperAdmin ? (
                            <button
                              onClick={() => setDeleteTarget({ id: flat.id, flat_number: flat.flat_number })}
                              className="p-1 rounded text-[#9ca3af] hover:text-red-600 transition cursor-pointer"
                              title="Developer Deletion"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span title="Deletions locked to Developer" className="text-[#d1d5db] p-1">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFlats.map(flat => {
            const hasTwoWheelers = flat.vehicles_data?.two_wheelers?.length || 0;
            const hasCars = flat.vehicles_data?.cars?.length || 0;

            return (
              <div
                key={flat.id}
                className="p-4 rounded-lg bg-white border border-[#e5e7eb] hover:border-[#cbd5e1] transition flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between pb-2.5 border-b border-[#f0f1f3]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-[#1f2937]">Flat {flat.flat_number}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f5f6f8] text-[#4b5563]">
                          Block {flat.block} · Floor {flat.floor}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6b7280] mt-0.5 font-mono">
                        {flat.area_sqft} sq.ft · ₹{(flat.maintenance_paise / 100).toLocaleString('en-IN')}/mo
                      </div>
                    </div>

                    {flat.is_claimed ? (
                      <span className="inline-block py-0.5 px-2 rounded-full text-[10px] font-semibold badge-paid">
                        Claimed
                      </span>
                    ) : (
                      <span className="inline-block py-0.5 px-2 rounded-full text-[10px] font-semibold badge-pending">
                        Unclaimed
                      </span>
                    )}
                  </div>

                  <div className="py-2.5 space-y-1.5 text-xs">
                    {flat.resident_name ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#1f2937]">{flat.resident_name}</span>
                          <span className="text-[10px] font-bold text-blue-600 uppercase">
                            {flat.occupancy_type || 'OCCUPANT'}
                          </span>
                        </div>
                        {flat.resident_phone && (
                          <div className="text-[#6b7280] text-[11px] font-mono mt-0.5">
                            Phone: {flat.resident_phone}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[#9ca3af] italic text-xs py-1">
                        No resident registered yet.
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#6b7280]">
                      {flat.family_count ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f6f8] text-[#374151]">
                          <Users className="w-3 h-3 text-blue-600" />
                          {flat.family_count} Family
                        </span>
                      ) : null}

                      {(hasTwoWheelers > 0 || hasCars > 0) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f6f8] text-[#374151]">
                          <Car className="w-3 h-3 text-[#6b7280]" />
                          {hasTwoWheelers} 2W · {hasCars} 4W
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#f0f1f3] flex items-center justify-between text-xs">
                  <div>
                    {flat.outstanding_paise && flat.outstanding_paise > 0 ? (
                      <span className="text-[#b42318] font-semibold text-[11px]">
                        Due: ₹{(flat.outstanding_paise / 100).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-[#16803c] font-semibold text-[11px]">
                        Cleared
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!flat.is_claimed && (
                      <button
                        onClick={onOpenClaimModal}
                        className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Claim Flat
                      </button>
                    )}

                    {isSuperAdmin ? (
                      <button
                        onClick={() => setDeleteTarget({ id: flat.id, flat_number: flat.flat_number })}
                        className="p-1 rounded text-[#9ca3af] hover:text-red-600 transition cursor-pointer"
                        title="Super Admin Deletion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span title="Deletions locked to Developer" className="text-[#d1d5db] p-1">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Flat Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white border border-[#e5e7eb] p-6 shadow-2xl text-[#1f2937]">
            <h3 className="text-base font-bold text-[#1f2937] mb-3">Add New Flat Unit</h3>
            <form onSubmit={handleAddFlat} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Flat Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A-501"
                    value={newFlatNum}
                    onChange={e => setNewFlatNum(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                </div>
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Block</label>
                  <select
                    value={newBlock}
                    onChange={e => setNewBlock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  >
                    <option value="A">Block A</option>
                    <option value="B">Block B</option>
                    <option value="C">Block C</option>
                    <option value="D">Block D</option>
                    <option value="E">Block E</option>
                    <option value="F">Block F</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Floor</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={newFloor}
                    onChange={e => setNewFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                </div>
                <div>
                  <label className="block text-[#374151] mb-1 font-semibold">Area (sq.ft)</label>
                  <input
                    type="number"
                    value={newArea}
                    onChange={e => setNewArea(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#f0f1f3]">
                <div className="text-[11px] font-bold text-[#6b7280] mb-2 uppercase">Initial Occupant (Optional)</div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Known resident name..."
                    value={newOccupantName}
                    onChange={e => setNewOccupantName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                  <input
                    type="tel"
                    placeholder="Primary mobile number..."
                    value={newOccupantPhone}
                    onChange={e => setNewOccupantPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-[#1f2937]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewOccupancyType('OWNER')}
                      className={`flex-1 py-1.5 rounded-lg border font-semibold ${
                        newOccupancyType === 'OWNER' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-[#e5e7eb] text-[#6b7280]'
                      }`}
                    >
                      Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewOccupancyType('TENANT')}
                      className={`flex-1 py-1.5 rounded-lg border font-semibold ${
                        newOccupancyType === 'TENANT' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-[#e5e7eb] text-[#6b7280]'
                      }`}
                    >
                      Tenant
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2 rounded-lg bg-[#f5f6f8] text-[#4b5563] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer"
                >
                  Save Flat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer Delete Modal */}
      {deleteTarget && (
        <DeveloperDeleteModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          entityType="FLAT"
          entityId={deleteTarget.id}
          entityDescription={`Flat ${deleteTarget.flat_number}`}
          onDeleted={() => {
            fetchFlats();
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
};
