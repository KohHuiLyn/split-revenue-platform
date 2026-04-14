import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Loader, Plus, AlertCircle } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string;
  priceDisplayUsd: string;
  isActive: boolean;
  createdAt: string;
}

export default function ProjectsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.projects.getAll();
      setProjects(response.data.projects || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load projects');
    } finally {
      setLoading(false);
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
      <div className="container py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-1">Manage your revenue-sharing projects</p>
          </div>
          <Link href="/projects/new">
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              New Project
            </button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader className="animate-spin text-primary" size={32} />
          </div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-5xl mb-4">📊</p>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No projects yet</h2>
            <p className="text-gray-500 mb-6">Create your first project to start splitting revenue with your team.</p>
            <Link href="/projects/new">
              <button className="btn-primary inline-flex items-center gap-2">
                <Plus size={18} />
                Create Project
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="card cursor-pointer hover:shadow-lg transition h-full">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                    <span className={`badge ${project.isActive ? 'badge-success' : 'badge-error'}`}>
                      {project.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
                    <span className="text-primary font-semibold text-lg">
                      ${project.priceDisplayUsd}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
