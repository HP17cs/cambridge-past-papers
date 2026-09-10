import { useState, useEffect } from 'react';
import api from '../api';
import SubjectCard from '../components/SubjectCard';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../contexts/AuthContext';

export default function Subjects() {
  const { preferences } = useAuth();
  const selectedSet = new Set(preferences?.subject_ids || []);
  const [subjects, setSubjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [qualification, setQualification] = useState('');
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    let result = subjects;
    if (search) {
      const q = search.trim().toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.qualification_short_name || '').toLowerCase().includes(q) ||
        (s.qualification_name || '').toLowerCase().includes(q)
      );
    }
    if (qualification) {
      result = result.filter(s => s.qualification_short_name === qualification);
    }
    setFiltered(result);
  }, [search, qualification, subjects]);

  const loadSubjects = async () => {
    try {
      const { data } = await api.get('/papers/subjects');
      setSubjects(data);
      setFiltered(data);
      const quals = [...new Set(data.map(s => s.qualification_short_name))].sort();
      setQualifications(quals);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 anim-fade-rise">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subjects</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">{subjects.length} subjects available</p>
      </div>

      <div className="space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search subjects..." className="w-full" />
        <select
          value={qualification}
          onChange={(e) => setQualification(e.target.value)}
          className="select px-4 py-2.5 rounded-xl sm:w-72"
        >
          <option value="">All Qualifications</option>
          {qualifications.map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((subject, i) => (
          <div
            key={subject.id}
            className="anim-fade-rise"
            style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
          >
            <SubjectCard subject={subject} selected={selectedSet.has(subject.id)} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          No subjects found matching your criteria.
        </div>
      )}
    </div>
  );
}
