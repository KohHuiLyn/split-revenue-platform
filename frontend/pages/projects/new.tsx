import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Loader, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

interface Collaborator {
  email: string;
  splitPercentage: number;
}

export default function NewProjectPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const addCollaborator = () => {
    setCollaborators([...collaborators, { email: '', splitPercentage: 0 }]);
  };

  const removeCollaborator = (index: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== index));
  };

  const updateCollaborator = (index: number, field: keyof Collaborator, value: string | number) => {
    const updated = [...collaborators];
    updated[index] = { ...updated[index], [field]: value };
    setCollaborators(updated);
  };

  const totalSplit = collaborators.reduce((sum, c) => sum + (Number(c.splitPercentage) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');

    if (collaborators.length > 0 && totalSplit !== 100) {
      setError(`Collaborator split percentages must add up to 100% (currently ${totalSplit}%)`);
      return;
    }

    const priceUsdcMicro = priceUsd ? Math.round(parseFloat(priceUsd) * 1_000_000) : 0;
    if (priceUsd && isNaN(priceUsdcMicro)) {
      setError('Invalid price');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.projects.create({
        name,
        description,
        priceUsdcMicro,
        collaborators,
      });

      if (response.data.collaboratorsNotFound?.length > 0) {
        setWarning(`Project created. Note: these collaborator emails were not found and were skipped: ${response.data.collaboratorsNotFound.join(', ')}`);
        setTimeout(() => router.push('/projects'), 3000);
      } else {
        router.push('/projects');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Project</h1>
          <p className="text-gray-600 mt-1">Set up a new revenue-sharing project</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {warning && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-yellow-800">{warning}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Name */}
          <div className="form-group mb-0">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="My Awesome Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group mb-0">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Price */}
          <div className="form-group mb-0">
            <label className="form-label">Price (USD)</label>
            <div className="flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-primary overflow-hidden">
              <span className="flex items-center px-3 bg-gray-100 text-gray-500 border-r border-gray-300 select-none">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="flex-1 px-3 py-2 focus:outline-none"
                placeholder="9.99"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
              />
            </div>
          </div>

          {/* Collaborators */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <label className="form-label mb-0">Collaborators</label>
                <p className="text-xs text-gray-500 mt-0.5">Split percentages must total 100%</p>
              </div>
              <button
                type="button"
                onClick={addCollaborator}
                className="btn-secondary flex items-center gap-1 text-sm py-1.5"
              >
                <Plus size={15} />
                Add
              </button>
            </div>

            {collaborators.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-lg">
                No collaborators — you keep 100% of revenue
              </p>
            ) : (
              <div className="space-y-3">
                {collaborators.map((c, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input
                      type="email"
                      className="form-input flex-1"
                      placeholder="collaborator@example.com"
                      value={c.email}
                      onChange={(e) => updateCollaborator(i, 'email', e.target.value)}
                      required
                    />
                    <div className="relative w-28 flex-shrink-0">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="form-input pr-7"
                        placeholder="50"
                        value={c.splitPercentage || ''}
                        onChange={(e) => updateCollaborator(i, 'splitPercentage', parseInt(e.target.value) || 0)}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCollaborator(i)}
                      className="p-2 text-gray-400 hover:text-red-500 transition flex-shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                <div className={`text-sm font-medium text-right pr-10 ${totalSplit === 100 ? 'text-green-600' : 'text-red-500'}`}>
                  Total: {totalSplit}% {totalSplit === 100 ? '✓' : `(need ${100 - totalSplit}% more)`}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader size={18} className="animate-spin" /> Creating...</> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
