import { useState, useEffect } from 'react';
import api from '../api';
import SubjectCard from '../components/SubjectCard';
import SearchBar from '../components/SearchBar';

export default function Subjects() {
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
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
        <p className="text-slate-500 mt-1">{subjects.length} subjects available</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search subjects..." className="flex-1" />
        <select
          value={qualification}
          onChange={(e) => setQualification(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Qualifications</option>
          {qualifications.map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(subject => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No subjects found matching your criteria.
        </div>
      )}
    </div>
  );
}
