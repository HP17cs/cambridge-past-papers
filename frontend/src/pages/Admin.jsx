import { useState, useEffect, useRef } from 'react';
import api from '../api';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [papers, setPapers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Subject form
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', qualificationId: '', description: '' });
  const [qualifications, setQualifications] = useState([]);

  // Paper form (builds Session -> Component -> Variant chain)
  const [paperForm, setPaperForm] = useState({ subjectId: '', year: '', session: 'mj', paperNumber: '', variant: '', paperType: 'theory', verified: false });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [subRes, qualRes, userRes] = await Promise.all([
        api.get('/admin/subjects'),
        api.get('/admin/qualifications'),
        api.get('/admin/users'),
      ]);
      setSubjects(subRes.data);
      setQualifications(qualRes.data);
      setUsers(userRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addSubject = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.post('/admin/subjects', subjectForm);
      setMessage('Subject created');
      setSubjectForm({ name: '', code: '', qualificationId: '', description: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const addPaper = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const { subjectId, year, session, paperNumber, variant, paperType, verified } = paperForm;
      // Ensure the session exists
      let sessionRes = await api.post('/admin/sessions', { subjectId, year: parseInt(year), session });
      const sessionId = sessionRes.data.id;
      // Create or locate component
      const compRes = await api.post(`/admin/sessions/${sessionId}/components`, { paperNumber: parseInt(paperNumber), paperType });
      const componentId = compRes.data.id;
      // Add variant
      await api.post(`/admin/components/${componentId}/variants`, { variantNumber: parseInt(variant), verified });
      setMessage('Paper (session + component + variant) created');
      setPaperForm({ subjectId: '', year: '', session: 'mj', paperNumber: '', variant: '', paperType: 'theory', verified: false });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const deleteSubject = async (id) => {
    if (!confirm('Delete this subject and all its papers?')) return;
    try {
      await api.delete(`/admin/subjects/${id}`);
      setMessage('Subject deleted');
      loadData();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/admin/import/papers', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(`Imported ${data.imported} of ${data.total} records. ${data.errors.length} errors.`);
    } catch (err) {
      setError('Import failed');
    }
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'subjects', label: 'Subjects' },
    { id: 'papers', label: 'Papers' },
    { id: 'import', label: 'Bulk Import' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <div className="space-y-6 anim-fade-rise">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-slate-500 mt-1">Manage the past paper database</p>
      </div>

      {message && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{message}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Subject</h2>
            <form onSubmit={addSubject} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input placeholder="Name" value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} required className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <input placeholder="Code (e.g. 5054)" value={subjectForm.code} onChange={e => setSubjectForm({...subjectForm, code: e.target.value})} required className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <select value={subjectForm.qualificationId} onChange={e => setSubjectForm({...subjectForm, qualificationId: e.target.value})} required className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                <option value="">Qualification</option>
                {qualifications.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
              <input placeholder="Description" value={subjectForm.description} onChange={e => setSubjectForm({...subjectForm, description: e.target.value})} className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 sm:col-span-2 w-fit">Add Subject</button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">{subjects.length} Subjects</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {subjects.map(s => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    <span className="text-xs text-slate-500 ml-2">{s.code} &middot; {s.qualification_short_name} &middot; {s.paper_count} papers</span>
                  </div>
                  <button onClick={() => deleteSubject(s.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'papers' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Paper (Session → Component → Variant)</h2>
          <form onSubmit={addPaper} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <select value={paperForm.subjectId} onChange={e => setPaperForm({...paperForm, subjectId: e.target.value})} required className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white">
                <option value="">Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
              <input type="number" placeholder="Year" value={paperForm.year} onChange={e => setPaperForm({...paperForm, year: e.target.value})} required className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm" />
              <select value={paperForm.session} onChange={e => setPaperForm({...paperForm, session: e.target.value})} className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white">
                <option value="mj">May/June</option>
                <option value="on">October/November</option>
              </select>
              <input type="number" placeholder="Paper Number" value={paperForm.paperNumber} onChange={e => setPaperForm({...paperForm, paperNumber: e.target.value})} required className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm" />
              <input type="number" placeholder="Variant Number (e.g. 12)" value={paperForm.variant} onChange={e => setPaperForm({...paperForm, variant: e.target.value})} required className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm" />
              <select value={paperForm.paperType} onChange={e => setPaperForm({...paperForm, paperType: e.target.value})} className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white">
                <option value="theory">Theory</option>
                <option value="practical">Practical</option>
                <option value="alternative_to_practical">Alternative to Practical</option>
                <option value="coursework">Coursework</option>
                <option value="oral">Oral</option>
                <option value="listening">Listening</option>
                <option value="speaking">Speaking</option>
                <option value="other">Other</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={paperForm.verified} onChange={e => setPaperForm({...paperForm, verified: e.target.checked})} className="w-4 h-4" />
                Verified
              </label>
            </div>
            <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">Add Paper</button>
          </form>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Bulk Import Papers</h2>
          <p className="text-sm text-slate-500 mb-4">Upload a CSV or JSON file with variant records. Required: subject_code, year, session (mj/on), paper_number, paper_type, variant_number. Optional: verified, question_paper_url, mark_scheme_url, examiner_report_url.</p>
          <input ref={fileInputRef} type="file" accept=".csv,.json" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            Choose CSV or JSON file
          </button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">{users.length} Users</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map(u => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-900">{u.name}</span>
                  <span className="text-xs text-slate-500 ml-2">{u.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  {u.is_admin ? <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">Admin</span> : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">User</span>}
                  <span className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
