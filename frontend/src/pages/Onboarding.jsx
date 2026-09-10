import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import SearchBar from '../components/SearchBar';

const STEPS = { welcome: 0, subjects: 1, display: 2 };

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get('edit') === '1';
  const { user, preferences, savePreferences, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(isEdit ? STEPS.subjects : STEPS.welcome);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [qualification, setQualification] = useState('');
  const [qualifications, setQualifications] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [showPref, setShowPref] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (isEdit && preferences) {
      setSelected(new Set(preferences.subject_ids || []));
      setShowPref(preferences.show_only_selected_subjects ? 'only' : 'all');
    }
  }, [isEdit, preferences, user]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/papers/subjects');
        setSubjects(data);
        setQualifications([...new Set(data.map((s) => s.qualification_short_name))].sort());
      } catch (err) {
        setError('Failed to load subjects. Please try again.');
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = subjects;
    if (search) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.qualification_short_name || '').toLowerCase().includes(q) ||
        (s.qualification_name || '').toLowerCase().includes(q)
      );
    }
    if (qualification) {
      result = result.filter((s) => s.qualification_short_name === qualification);
    }
    return result;
  }, [subjects, search, qualification]);

  const toggleSubject = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = async () => {
    if (selected.size === 0) {
      setError('Select at least one subject to continue.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await savePreferences({
        subject_ids: [...selected],
        show_only_selected_subjects: showPref === 'only',
        onboarding_completed: true,
      });
      updateUser({
        onboarding_completed: data.onboarding_completed,
        show_only_selected_subjects: data.show_only_selected_subjects,
      });
      navigate(isEdit ? '/settings' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selected.size;

  const selectableHighlight = (card) =>
    card
      ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 dark:border-primary-500 shadow-brand'
      : 'border-slate-200 hover:border-primary-300 dark:border-slate-700 dark:hover:border-primary-500/60';

  return (
    <div className="max-w-4xl mx-auto anim-fade-rise">
      {step === STEPS.welcome && (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mb-6 shadow-brand">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome to Cambridge Past Papers 👋</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-md">
            Track your Cambridge past papers, mark them complete and stay on top of every
            subject — all in one place.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">Made by HP17</p>
          <button
            onClick={() => setStep(STEPS.subjects)}
            className="btn-primary mt-8 px-8"
          >
            Choose My Subjects
          </button>
        </div>
      )}

      {step >= STEPS.subjects && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEdit ? 'Edit Your Subjects' : 'Choose My Subjects'}
            </h1>
            <p className="text-slate-500 mt-1 dark:text-slate-400">
              Pick the subjects you're taking so we can put them front and centre.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">{error}</div>
          )}

          <div className="space-y-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search subjects..." className="w-full" />
            <select
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              className="select px-4 py-2.5 rounded-xl sm:w-72"
            >
              <option value="">All Qualifications</option>
              {qualifications.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((subject) => {
              const on = selected.has(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggleSubject(subject.id)}
                  aria-pressed={on}
                  className={`card p-4 text-left transition-all duration-200 border-2 ${selectableHighlight(on)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{subject.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
                        {subject.code} &middot; {subject.qualification_short_name}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      on ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              No subjects found matching your criteria.
            </div>
          )}

          <div className="flex items-center justify-between pt-2 pb-10">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {selectedCount > 0 ? `${selectedCount} subject${selectedCount > 1 ? 's' : ''} selected` : 'Select at least one subject'}
            </p>
            <div className="flex items-center gap-3">
              {isEdit && (
                <button
                  onClick={() => navigate('/settings')}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => setStep(STEPS.display)}
                disabled={selectedCount === 0}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {step === STEPS.display && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">How should we show papers?</h1>
            <p className="text-slate-500 mt-1 dark:text-slate-400">
              Choose how Past Papers should be displayed for you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setShowPref('only')}
              aria-pressed={showPref === 'only'}
              className={`card p-6 text-left transition-all duration-200 border-2 ${showPref === 'only' ? selectableHighlight(true) : selectableHighlight(false)}`}
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Only my subjects</h3>
              <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
                Past Papers will only show papers from the {selectedCount} subject{selectedCount > 1 ? 's' : ''} you chose. Clean and focused.
              </p>
              {showPref === 'only' && (
                <span className="inline-flex items-center gap-1 text-xs text-primary-700 mt-3 font-medium dark:text-primary-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Selected
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowPref('all')}
              aria-pressed={showPref === 'all'}
              className={`card p-6 text-left transition-all duration-200 border-2 ${showPref === 'all' ? selectableHighlight(true) : selectableHighlight(false)}`}
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">All subjects</h3>
              <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
                See every past paper, with your {selectedCount} chosen subject{selectedCount > 1 ? 's' : ''} highlighted so they stand out.
              </p>
              {showPref === 'all' && (
                <span className="inline-flex items-center gap-1 text-xs text-primary-700 mt-3 font-medium dark:text-primary-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Selected
                </span>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">{error}</div>
          )}

          <div className="flex items-center justify-between pt-2 pb-10">
            <button
              onClick={() => setStep(STEPS.subjects)}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back
            </button>
            <button
              onClick={finish}
              disabled={loading}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : isEdit ? 'Save Preferences' : 'Finish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}